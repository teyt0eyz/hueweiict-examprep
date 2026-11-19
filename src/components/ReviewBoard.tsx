"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import QuestionView from "@/components/exam/QuestionView";
import { loadByIds } from "@/lib/bank";
import { dueIds, setPending, toggleBookmark } from "@/lib/progress";
import type { QItem, SrsItem } from "@/lib/types";
import { useMounted, useStore } from "@/lib/useStore";

type Tab = "due" | "wrong" | "bookmarks";
const BOX_LABEL = ["", "รอบ 1 (วันนี้)", "รอบ 2 (+1 วัน)", "รอบ 3 (+3 วัน)", "รอบ 4 (+7 วัน)", "รอบ 5 (+14 วัน)"];

export default function ReviewBoard() {
  const router = useRouter();
  const mounted = useMounted();
  const srs = useStore<Record<string, SrsItem>>("srs", {});
  const bookmarks = useStore<string[]>("bookmarks", []);
  const [tab, setTab] = useState<Tab>("due");
  const [qs, setQs] = useState<Map<string, QItem>>(new Map());
  const [open, setOpen] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const due = dueIds(srs, now);
  const wrong = Object.entries(srs)
    .sort((a, b) => b[1].wrong - a[1].wrong || b[1].lastWrong - a[1].lastWrong)
    .map(([id]) => id);
  const list = tab === "due" ? due : tab === "wrong" ? wrong : bookmarks;
  const allIds = [...new Set([...wrong, ...bookmarks])].join(",");

  useEffect(() => {
    if (!allIds) return;
    let cancelled = false;
    loadByIds(allIds.split(",")).then((r) => {
      if (!cancelled) setQs(new Map(r.map((q) => [q.id, q])));
    });
    return () => {
      cancelled = true;
    };
  }, [allIds]);

  function start(ids: string[]) {
    setPending("review", ids);
    router.push("/mock/review/");
  }

  if (!mounted) return <div className="h-40 animate-pulse rounded-xl border border-border bg-surface" />;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card title="ถึงรอบทบทวน" value={due.length} action={due.length ? () => start(due.slice(0, 30)) : undefined} actionLabel="เริ่มทบทวน" />
        <Card title="ข้อที่เคยผิด (ยังไม่ผ่าน 5 รอบ)" value={wrong.length} action={wrong.length ? () => start(wrong.slice(0, 30)) : undefined} actionLabel="ทำทั้งหมด" />
        <Card title="Bookmark" value={bookmarks.length} action={bookmarks.length ? () => start(bookmarks.slice(0, 30)) : undefined} actionLabel="ทำข้อ bookmark" />
      </div>
      <p className="text-sm text-muted">
        ระบบใช้ Leitner box: ตอบผิด → กลับไปรอบ 1 · ตอบถูก → เลื่อนรอบถัดไป (+1, +3, +7, +14 วัน) · ถูกครบรอบ 5 ถือว่าจำได้แล้วและถูกนำออกจากรายการ
      </p>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["due", `ถึงรอบ (${due.length})`],
            ["wrong", `เคยผิด (${wrong.length})`],
            ["bookmarks", `Bookmark (${bookmarks.length})`],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button key={t} type="button" onClick={() => setTab(t)} aria-pressed={tab === t} className={`rounded-md border px-3 py-1.5 text-sm ${tab === t ? "border-accent bg-accent-soft text-accent" : "border-border"}`}>
            {label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-muted">
          ยังไม่มีข้อในรายการนี้ — ลอง <Link href="/mock/drill/" className="text-accent underline">Quick Drill</Link> หรือ <Link href="/mock/" className="text-accent underline">Mock Test</Link> แล้วข้อที่ตอบผิดจะมาอยู่ที่นี่
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((id) => {
            const q = qs.get(id);
            const s = srs[id];
            return (
              <li key={id} className="rounded-xl border border-border bg-surface">
                <button type="button" onClick={() => setOpen(open === id ? null : id)} aria-expanded={open === id} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 p-3 text-left text-sm">
                  <span className="font-mono text-xs text-muted">{id}</span>
                  <span className="min-w-0 flex-1 truncate">{q ? q.topic : "…"}</span>
                  {s && <span className="text-xs text-muted">ผิด {s.wrong} ครั้ง · {BOX_LABEL[s.box]}</span>}
                  <span className="text-muted">{open === id ? "▾" : "▸"}</span>
                </button>
                {open === id && q && (
                  <div className="border-t border-border p-3">
                    <QuestionView q={q} number={list.indexOf(id) + 1} order={q.options.map((o) => o.id)} answer={[]} revealed bookmarked={bookmarks.includes(id)} onBookmark={() => toggleBookmark(id)} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Card({ title, value, action, actionLabel }: { title: string; value: number; action?: () => void; actionLabel: string }) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface p-4">
      <p className="text-sm text-muted">{title}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
      <button type="button" onClick={action} disabled={!action} className="mt-3 rounded-lg border border-accent px-3 py-1.5 text-sm font-medium text-accent disabled:border-border disabled:text-muted disabled:opacity-60">
        {actionLabel}
      </button>
    </div>
  );
}
