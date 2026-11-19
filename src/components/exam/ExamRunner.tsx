"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadAll, loadByIds, loadIndex, loadMockSet, loadModule, type BankIndex } from "@/lib/bank";
import { formatDuration, grade, isCorrect, newAttempt, pickWeighted, shuffle } from "@/lib/exam";
import { getMock, PASS_SCORE } from "@/lib/mocks";
import { addHistory, clearAttempt, getAttempt, getBookmarks, getPending, recordResults, saveAttempt, toggleBookmark } from "@/lib/progress";
import type { Attempt, MockDef, QItem } from "@/lib/types";
import QuestionView from "./QuestionView";

type Phase = "loading" | "intro" | "running" | "empty";

async function buildPool(def: MockDef): Promise<QItem[]> {
  switch (def.kind) {
    case "full": {
      const set = await loadMockSet(def.id);
      const qs = set ? await loadByIds(set.ids) : [];
      if (qs.length >= def.count) return qs;
      // fixed set not ready yet → fall back to a weighted random draw
      return pickWeighted(await loadAll(), def.count);
    }
    case "full-random":
      return pickWeighted(await loadAll(), def.count);
    case "module":
      return shuffle(await loadModule(def.module!)).slice(0, def.count);
    case "drill":
      return shuffle(await loadAll()).slice(0, def.count);
    case "retry":
    case "review":
      return loadByIds(getPending(def.id));
  }
}

export default function ExamRunner({ mockId }: { mockId: string }) {
  const def = getMock(mockId)!;
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [att, setAtt] = useState<Attempt | null>(null);
  const [qs, setQs] = useState<QItem[]>([]);
  const [index, setIndex] = useState<BankIndex | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [confirming, setConfirming] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const submitted = useRef(false);

  const qMap = useMemo(() => new Map(qs.map((q) => [q.id, q])), [qs]);

  const submit = useCallback(
    (a: Attempt, list: QItem[], timedOut: boolean) => {
      if (submitted.current) return;
      submitted.current = true;
      const h = grade(a, list, timedOut);
      addHistory(h);
      const map = new Map(list.map((q) => [q.id, q]));
      // unanswered questions are not fed into spaced review
      recordResults(a.questionIds.filter((id) => map.has(id) && (a.answers[id]?.length ?? 0) > 0).map((id) => ({ id, correct: isCorrect(map.get(id)!, a.answers[id]) })));
      clearAttempt(a.mockId);
      router.push(`/mock/${a.mockId}/result/?a=${encodeURIComponent(h.attemptId)}`);
    },
    [router],
  );

  // initial load: resume an in-progress attempt or show the intro
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [idx, existing] = await Promise.all([loadIndex(), Promise.resolve(getAttempt(mockId))]);
      if (cancelled) return;
      setIndex(idx);
      setBookmarks(getBookmarks());
      setPendingCount(def.kind === "retry" || def.kind === "review" ? getPending(def.id).length : 0);
      if (existing) {
        const list = await loadByIds(existing.questionIds);
        if (cancelled) return;
        if (existing.deadline && Date.now() >= existing.deadline) {
          submit(existing, list, true);
          return;
        }
        setQs(list);
        setAtt(existing);
        setPhase("running");
      } else {
        setPhase("intro");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mockId, def.id, def.kind, submit]);

  async function start() {
    setPhase("loading");
    const pool = await buildPool(def);
    if (pool.length === 0) {
      setPhase("empty");
      return;
    }
    const a = newAttempt(def.id, def.title, pool, def.minutes, def.instant);
    saveAttempt(a);
    submitted.current = false;
    setQs(pool);
    setAtt(a);
    setNow(Date.now());
    setPhase("running");
  }

  const update = useCallback((fn: (a: Attempt) => Attempt) => {
    setAtt((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      saveAttempt(next);
      return next;
    });
  }, []);

  // countdown
  useEffect(() => {
    if (phase !== "running" || !att?.deadline) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [phase, att?.deadline]);

  useEffect(() => {
    if (phase === "running" && att?.deadline && now >= att.deadline) submit(att, qs, true);
  }, [now, phase, att, qs, submit]);

  const cur = att ? qMap.get(att.questionIds[att.current]) : undefined;
  const total = att?.questionIds.length ?? 0;

  const setAnswer = useCallback(
    (ids: string[]) => {
      if (!att || !cur) return;
      if (att.instant && att.checked.includes(cur.id)) return;
      const autoCheck = att.instant && (cur.type === "single" || cur.type === "truefalse");
      update((a) => ({
        ...a,
        answers: { ...a.answers, [cur.id]: ids },
        checked: autoCheck && !a.checked.includes(cur.id) ? [...a.checked, cur.id] : a.checked,
      }));
    },
    [att, cur, update],
  );

  const go = useCallback((i: number) => update((a) => ({ ...a, current: Math.max(0, Math.min(a.questionIds.length - 1, i)) })), [update]);
  const toggleFlag = useCallback(() => {
    if (!cur) return;
    update((a) => ({ ...a, flags: a.flags.includes(cur.id) ? a.flags.filter((x) => x !== cur.id) : [...a.flags, cur.id] }));
  }, [cur, update]);
  const check = useCallback(() => {
    if (!cur) return;
    update((a) => {
      if (a.checked.includes(cur.id)) return a;
      // ordering: checking without moving anything means "this order is my answer"
      const answers = cur.type === "ordering" && !a.answers[cur.id]?.length ? { ...a.answers, [cur.id]: a.optionOrder[cur.id] } : a.answers;
      return { ...a, answers, checked: [...a.checked, cur.id] };
    });
  }, [cur, update]);

  // keyboard shortcuts: 1–9 choose, ←/→ navigate, F flag, Enter check (instant mode)
  useEffect(() => {
    if (phase !== "running") return;
    function onKey(e: KeyboardEvent) {
      if (!att || !cur || confirming) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(att.current + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(att.current - 1);
      } else if (e.key === "f" || e.key === "F") {
        toggleFlag();
      } else if (e.key === "Enter" && att.instant && !att.checked.includes(cur.id) && (att.answers[cur.id]?.length ?? 0) > 0) {
        check();
      } else if (/^[1-9]$/.test(e.key) && cur.type !== "ordering") {
        const order = att.optionOrder[cur.id];
        const id = order[Number(e.key) - 1];
        if (!id) return;
        const chosen = att.answers[cur.id] ?? [];
        setAnswer(cur.type === "multiple" ? (chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id]) : [id]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, att, cur, confirming, go, toggleFlag, check, setAnswer]);

  // ------------------------------------------------------------------ render
  if (phase === "loading") {
    return <div className="h-64 animate-pulse rounded-xl border border-border bg-surface" aria-busy="true" aria-label="กำลังโหลด" />;
  }

  if (phase === "empty") {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="font-medium">ไม่มีข้อสอบสำหรับโหมดนี้</p>
        <p className="mt-1 text-sm text-muted">
          {def.kind === "retry" ? "ไม่มีข้อที่ตอบผิดจากการสอบครั้งล่าสุด" : def.kind === "review" ? "ยังไม่มีข้อที่ถึงรอบทบทวน" : "question bank ของส่วนนี้ยังว่าง"}
        </p>
        <Link href="/mock/" className="mt-4 inline-block rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-2">กลับไปเลือกชุดข้อสอบ</Link>
      </div>
    );
  }

  if (phase === "intro") {
    const available = def.kind === "module" ? index?.modules[def.module!]?.count ?? 0 : def.kind === "retry" || def.kind === "review" ? pendingCount : index?.total ?? 0;
    const count = def.count ? Math.min(def.count, available) : available;
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <h1 className="text-2xl font-bold">{def.title}</h1>
        <p className="mt-1 text-muted">{def.desc}</p>
        <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-surface-2 p-3">
            <dt className="text-xs text-muted">จำนวนข้อ</dt>
            <dd className="text-xl font-semibold tabular-nums">{count}</dd>
          </div>
          <div className="rounded-lg bg-surface-2 p-3">
            <dt className="text-xs text-muted">เวลา</dt>
            <dd className="text-xl font-semibold">{def.minutes ? `${def.minutes} นาที` : "ไม่จำกัด"}</dd>
          </div>
          <div className="rounded-lg bg-surface-2 p-3">
            <dt className="text-xs text-muted">เกณฑ์ผ่าน</dt>
            <dd className="text-xl font-semibold tabular-nums">{PASS_SCORE}/1000</dd>
          </div>
        </dl>
        <ul className="mt-6 list-disc space-y-1 pl-5 text-sm text-muted">
          {def.minutes && <li>เมื่อหมดเวลา ระบบจะส่งคำตอบให้อัตโนมัติ</li>}
          {def.instant ? <li>โหมดเฉลยทันที: ข้อ single/true-false เฉลยเมื่อเลือก, ข้อ multiple/ordering กด “ตรวจคำตอบ” (หรือ Enter)</li> : <li>เฉลยทั้งหมดจะแสดงหลังส่งคำตอบ</li>}
          <li>ข้อ multiple-answer ต้องเลือกครบทุกข้อที่ถูก และไม่เลือกข้อผิด จึงได้คะแนน</li>
          <li>ลำดับข้อและตัวเลือกถูกสลับทุกครั้ง · ความคืบหน้าบันทึกอัตโนมัติ รีเฟรชแล้วทำต่อได้</li>
          <li>
            คีย์ลัด: <kbd>1</kbd>–<kbd>5</kbd> เลือกคำตอบ · <kbd>←</kbd>/<kbd>→</kbd> เปลี่ยนข้อ · <kbd>F</kbd> flag
          </li>
        </ul>
        {count < def.count && def.count > 0 && (
          <p className="mt-4 rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm">question bank ตอนนี้มี {available} ข้อ — จะใช้เท่าที่มี</p>
        )}
        <button type="button" onClick={start} disabled={count === 0} className="mt-6 w-full rounded-lg bg-accent px-5 py-3 font-semibold text-accent-fg hover:opacity-90 disabled:opacity-40">
          เริ่มทำข้อสอบ
        </button>
      </div>
    );
  }

  if (!att || !cur) return null;

  const answeredCount = att.questionIds.filter((id) => (att.answers[id]?.length ?? 0) > 0).length;
  const unanswered = total - answeredCount;
  const remaining = att.deadline ? Math.max(0, Math.round((att.deadline - now) / 1000)) : null;
  const revealed = att.instant && att.checked.includes(cur.id);
  const flagged = att.flags.includes(cur.id);
  const curAnswer = att.answers[cur.id];
  const needsCheck = att.instant && !revealed && (cur.type === "multiple" || cur.type === "ordering");

  const navigator = (
    <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10 lg:grid-cols-5">
      {att.questionIds.map((id, i) => {
        const q = qMap.get(id);
        const done = (att.answers[id]?.length ?? 0) > 0;
        const isFlag = att.flags.includes(id);
        const checkedTone = att.instant && att.checked.includes(id) && q ? (isCorrect(q, att.answers[id]) ? "border-success text-success" : "border-danger text-danger") : "";
        return (
          <button
            key={id}
            type="button"
            onClick={() => {
              go(i);
              setNavOpen(false);
            }}
            aria-label={`ข้อ ${i + 1}${done ? " ตอบแล้ว" : ""}${isFlag ? " flagged" : ""}`}
            aria-current={i === att.current ? "step" : undefined}
            className={`relative h-9 rounded-md border text-sm tabular-nums ${i === att.current ? "ring-2 ring-accent" : ""} ${checkedTone || (done ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:text-fg")}`}
          >
            {i + 1}
            {isFlag && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-warning" aria-hidden />}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="pb-24 lg:pb-0">
      {/* top bar */}
      <div className="sticky top-14 z-30 -mx-4 mb-4 border-b border-border bg-bg/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{att.title}</p>
            <p className="text-xs text-muted tabular-nums">
              ตอบแล้ว {answeredCount}/{total}
              {att.flags.length > 0 && ` · flag ${att.flags.length}`}
            </p>
          </div>
          {remaining !== null && (
            <div className={`w-[5.5rem] rounded-lg border px-2 py-1 text-center font-mono text-lg tabular-nums ${remaining < 300 ? "border-danger text-danger" : "border-border"}`} role="timer" aria-label="เวลาที่เหลือ">
              {formatDuration(remaining)}
            </div>
          )}
          <button type="button" onClick={() => setConfirming(true)} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:opacity-90">
            ส่งคำตอบ
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_15rem]">
        <div className="min-h-[28rem]">
          <QuestionView
            key={cur.id}
            q={cur}
            number={att.current + 1}
            total={total}
            order={att.optionOrder[cur.id] ?? cur.options.map((o) => o.id)}
            answer={curAnswer}
            onAnswer={setAnswer}
            revealed={revealed}
            showMeta={att.instant || att.mockId.startsWith("m")}
            bookmarked={bookmarks.includes(cur.id)}
            onBookmark={() => setBookmarks(toggleBookmark(cur.id))}
          />

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => go(att.current - 1)} disabled={att.current === 0} className="rounded-lg border border-border px-4 py-2 disabled:opacity-40">
              ← ก่อนหน้า
            </button>
            <button type="button" onClick={toggleFlag} aria-pressed={flagged} className={`rounded-lg border px-4 py-2 ${flagged ? "border-warning bg-warning/10 text-warning" : "border-border"}`}>
              {flagged ? "⚑ Flagged" : "⚐ Flag"}
            </button>
            {needsCheck && (
              <button type="button" onClick={check} disabled={cur.type !== "ordering" && !curAnswer?.length} className="rounded-lg border border-accent px-4 py-2 text-accent disabled:opacity-40">
                ตรวจคำตอบ
              </button>
            )}
            {att.current < total - 1 ? (
              <button type="button" onClick={() => go(att.current + 1)} className="ml-auto rounded-lg bg-surface-2 px-4 py-2 font-medium hover:bg-border">
                ถัดไป →
              </button>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className="ml-auto rounded-lg bg-accent px-4 py-2 font-semibold text-accent-fg">
                ส่งคำตอบ
              </button>
            )}
          </div>
        </div>

        <aside className="hidden lg:block" aria-label="ตัวนำทางข้อสอบ">
          <div className="sticky top-32 rounded-xl border border-border bg-surface p-3">
            <p className="mb-2 text-xs font-medium text-muted">ข้อทั้งหมด</p>
            {navigator}
            <Legend />
          </div>
        </aside>
      </div>

      {/* mobile navigator */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface lg:hidden">
        {navOpen && <div className="max-h-[50vh] overflow-y-auto p-3">{navigator}<Legend /></div>}
        <button type="button" onClick={() => setNavOpen((v) => !v)} aria-expanded={navOpen} className="flex w-full items-center justify-between px-4 py-3 text-sm">
          <span>
            ข้อ {att.current + 1}/{total} · ยังไม่ตอบ {unanswered}
          </span>
          <span className="text-muted">{navOpen ? "ซ่อน ▾" : "ดูข้อทั้งหมด ▴"}</span>
        </button>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-h">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5">
            <h2 id="confirm-h" className="text-lg font-semibold">ส่งคำตอบ?</h2>
            <p className="mt-2 text-sm text-muted">
              ตอบแล้ว {answeredCount} จาก {total} ข้อ
              {unanswered > 0 && <span className="text-danger"> · ยังไม่ได้ตอบ {unanswered} ข้อ</span>}
              {att.flags.length > 0 && <span> · flag ไว้ {att.flags.length} ข้อ</span>}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" autoFocus onClick={() => setConfirming(false)} className="rounded-lg border border-border px-4 py-2">
                กลับไปทำต่อ
              </button>
              <button type="button" onClick={() => submit(att, qs, false)} className="rounded-lg bg-accent px-4 py-2 font-semibold text-accent-fg">
                ยืนยันส่ง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
      <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-accent bg-accent-soft" />ตอบแล้ว</span>
      <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-warning" />flag</span>
      <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-border" />ยังไม่ตอบ</span>
    </div>
  );
}
