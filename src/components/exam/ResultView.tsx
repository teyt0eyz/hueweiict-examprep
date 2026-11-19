"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { loadByIds } from "@/lib/bank";
import { formatDuration, isCorrect } from "@/lib/exam";
import { PASS_SCORE } from "@/lib/mocks";
import { MODULES } from "@/lib/modules";
import { getBookmarks, getHistory, setPending, toggleBookmark } from "@/lib/progress";
import type { HistoryEntry, QItem } from "@/lib/types";
import QuestionView from "./QuestionView";

type Filter = "all" | "wrong" | "flagged";

export default function ResultView({ mockId }: { mockId: string }) {
  const router = useRouter();
  const [entry, setEntry] = useState<HistoryEntry | null | undefined>(undefined);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [qs, setQs] = useState<QItem[]>([]);
  const [filter, setFilter] = useState<Filter>("wrong");
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const a = new URLSearchParams(window.location.search).get("a");
      const all = getHistory();
      const e = (a ? all.find((h) => h.attemptId === a) : all.find((h) => h.mockId === mockId)) ?? null;
      const list = e ? await loadByIds(e.questionIds) : [];
      if (cancelled) return;
      setHistory(all);
      setBookmarks(getBookmarks());
      setQs(list);
      setEntry(e);
    })();
    return () => {
      cancelled = true;
    };
  }, [mockId]);

  const qMap = useMemo(() => new Map(qs.map((q) => [q.id, q])), [qs]);

  if (entry === undefined) return <div className="h-64 animate-pulse rounded-xl border border-border bg-surface" aria-busy="true" />;
  if (entry === null)
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="font-medium">ไม่พบผลสอบ</p>
        <p className="mt-1 text-sm text-muted">ผลสอบถูกเก็บในเบราว์เซอร์นี้เท่านั้น — อาจถูกลบไปแล้ว หรือยังไม่เคยทำชุดนี้</p>
        <Link href={`/mock/${mockId}/`} className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg">ทำข้อสอบชุดนี้</Link>
      </div>
    );

  const wrongIds = entry.questionIds.filter((id) => {
    const q = qMap.get(id);
    return q && !isCorrect(q, entry.answers[id]);
  });
  const modules = MODULES.filter((m) => entry.perModule[m.id]).map((m) => ({ ...m, ...entry.perModule[m.id], pct: entry.perModule[m.id].correct / entry.perModule[m.id].total }));
  const weak = modules.filter((m) => m.pct < 0.6).sort((a, b) => a.pct - b.pct);
  const shown = entry.questionIds.filter((id) => (filter === "all" ? true : filter === "wrong" ? wrongIds.includes(id) : entry.flags.includes(id)));
  const trend = history.filter((h) => h.total >= 10).slice(0, 12).reverse();

  function retryWrong() {
    setPending("retry", wrongIds);
    router.push("/mock/retry/");
  }

  return (
    <div className="space-y-8">
      {/* headline */}
      <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <p className="text-sm text-muted">{entry.title}</p>
        <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-3">
          <p className="text-5xl font-bold tabular-nums">
            {entry.score}
            <span className="text-xl font-medium text-muted">/1000</span>
          </p>
          <p className={`mb-1 rounded-full px-3 py-1 text-sm font-semibold ${entry.passed ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>
            {entry.passed ? "✓ ผ่าน" : "✗ ไม่ผ่าน"} <span className="font-normal">(เกณฑ์ {PASS_SCORE})</span>
          </p>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="ตอบถูก" value={`${entry.correct}/${entry.total}`} />
          <Stat label="ตอบผิด/ไม่ตอบ" value={String(entry.total - entry.correct)} />
          <Stat label="เวลาที่ใช้" value={formatDuration(entry.durationSec)} />
          <Stat label="ส่งเมื่อ" value={new Date(entry.finishedAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })} />
        </dl>
        {entry.timedOut && <p className="mt-3 text-sm text-warning">⏱ หมดเวลา — ระบบส่งคำตอบอัตโนมัติ</p>}
        <div className="mt-6 flex flex-wrap gap-2">
          {wrongIds.length > 0 && (
            <button type="button" onClick={retryWrong} className="rounded-lg bg-accent px-4 py-2 font-semibold text-accent-fg">
              ทำเฉพาะข้อที่ผิดอีกรอบ ({wrongIds.length})
            </button>
          )}
          <Link href={`/mock/${entry.mockId}/`} className="rounded-lg border border-border px-4 py-2 hover:bg-surface-2">ทำชุดนี้ใหม่</Link>
          <Link href="/review/" className="rounded-lg border border-border px-4 py-2 hover:bg-surface-2">ไปหน้าทบทวน</Link>
        </div>
      </section>

      {/* per-module bars */}
      <section aria-labelledby="mod-h" className="rounded-xl border border-border bg-surface p-5 sm:p-6">
        <h2 id="mod-h" className="font-semibold">คะแนนรายหัวข้อ</h2>
        <p className="mb-4 text-sm text-muted">เส้นประ = 60% (เกณฑ์ผ่าน) · แถบสีแดงคือหัวข้อที่ควรกลับไปทบทวน</p>
        <ul className="space-y-2.5">
          {modules.map((m) => (
            <li key={m.id} className="grid grid-cols-[3.2rem_1fr_4.8rem] items-center gap-3 text-sm" title={`${m.id} ${m.title}: ${m.correct}/${m.total} (${Math.round(m.pct * 100)}%)`}>
              <span className="font-mono text-muted">{m.id}</span>
              <span className="relative h-5 rounded bg-surface-2">
                <span className={`absolute inset-y-0 left-0 rounded ${m.pct < 0.6 ? "bg-danger" : "bg-accent"}`} style={{ width: `${Math.max(m.pct * 100, 1.5)}%` }} />
                <span className="absolute inset-y-[-3px] left-[60%] border-l-2 border-dashed border-fg/40" aria-hidden />
              </span>
              <span className="text-right tabular-nums">
                {m.correct}/{m.total} <span className="text-muted">· {Math.round(m.pct * 100)}%</span>
              </span>
            </li>
          ))}
        </ul>
        {weak.length > 0 ? (
          <div className="mt-5 rounded-lg bg-surface-2 p-4">
            <p className="text-sm font-medium">แนะนำให้กลับไปอ่าน</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {weak.map((m) => (
                <li key={m.id}>
                  <Link href={`/lessons/${m.slug}/`} className="inline-block rounded-md border border-border bg-surface px-3 py-1.5 text-sm hover:border-accent">
                    {m.id} {m.title} →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-sm text-success">✓ ทุกหัวข้อได้ตั้งแต่ 60% ขึ้นไป</p>
        )}
      </section>

      {trend.length >= 2 && <Trend entries={trend} currentId={entry.attemptId} />}

      {/* answer review */}
      <section aria-labelledby="ans-h">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 id="ans-h" className="mr-auto font-semibold">เฉลยและคำอธิบาย</h2>
          {(
            [
              ["wrong", `ผิด (${wrongIds.length})`],
              ["flagged", `Flag (${entry.flags.length})`],
              ["all", `ทั้งหมด (${entry.total})`],
            ] as [Filter, string][]
          ).map(([f, label]) => (
            <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f} className={`rounded-md border px-3 py-1 text-sm ${filter === f ? "border-accent bg-accent-soft text-accent" : "border-border"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          {shown.length === 0 && <p className="text-sm text-muted">ไม่มีข้อในหมวดนี้</p>}
          {shown.map((id) => {
            const q = qMap.get(id);
            if (!q) return null;
            return (
              <QuestionView
                key={id}
                q={q}
                number={entry.questionIds.indexOf(id) + 1}
                total={entry.total}
                order={entry.optionOrder[id] ?? q.options.map((o) => o.id)}
                answer={entry.answers[id]}
                revealed
                bookmarked={bookmarks.includes(id)}
                onBookmark={() => setBookmarks(toggleBookmark(id))}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

/** Score trend across recent attempts (single series line, 0–1000, pass line at 600). */
export function Trend({ entries, currentId }: { entries: HistoryEntry[]; currentId?: string }) {
  const W = 640;
  const H = 200;
  const P = { l: 36, r: 12, t: 12, b: 26 };
  const x = (i: number) => P.l + (entries.length === 1 ? 0 : (i * (W - P.l - P.r)) / (entries.length - 1));
  const y = (s: number) => P.t + (1 - s / 1000) * (H - P.t - P.b);
  const path = entries.map((e, i) => `${i ? "L" : "M"}${x(i)},${y(e.score)}`).join(" ");
  return (
    <section aria-labelledby="trend-h" className="rounded-xl border border-border bg-surface p-5 sm:p-6">
      <h2 id="trend-h" className="font-semibold">แนวโน้มคะแนน (การสอบล่าสุด {entries.length} ครั้ง)</h2>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-auto w-full" role="img" aria-label="กราฟคะแนนย้อนหลัง">
        {[0, 250, 500, 750, 1000].map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth={1} />
            <text x={P.l - 6} y={y(v) + 3} fontSize={10} textAnchor="end" fill="var(--muted)">{v}</text>
          </g>
        ))}
        <line x1={P.l} x2={W - P.r} y1={y(PASS_SCORE)} y2={y(PASS_SCORE)} stroke="var(--fg)" strokeOpacity={0.45} strokeDasharray="5 4" strokeWidth={1.5} />
        <text x={W - P.r} y={y(PASS_SCORE) - 4} fontSize={10} textAnchor="end" fill="var(--muted)">ผ่าน 600</text>
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
        {entries.map((e, i) => (
          <g key={e.attemptId}>
            <circle cx={x(i)} cy={y(e.score)} r={e.attemptId === currentId ? 6 : 4.5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
            <circle cx={x(i)} cy={y(e.score)} r={14} fill="transparent">
              <title>{`${e.title}\n${new Date(e.finishedAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}\n${e.score}/1000 (${e.correct}/${e.total})`}</title>
            </circle>
          </g>
        ))}
      </svg>
      <table className="sr-only">
        <caption>คะแนนย้อนหลัง</caption>
        <tbody>
          {entries.map((e) => (
            <tr key={e.attemptId}>
              <td>{e.title}</td>
              <td>{e.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
