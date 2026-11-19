"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDuration } from "@/lib/exam";
import { MOCKS } from "@/lib/mocks";
import type { Attempt, HistoryEntry } from "@/lib/types";
import { useMounted, useStore } from "@/lib/useStore";
import { readStore } from "@/lib/storage";
import { Trend } from "./ResultView";

export function InProgress() {
  const mounted = useMounted();
  const [now] = useState(() => Date.now());
  useStore<HistoryEntry[]>("history", []); // re-render after submissions
  if (!mounted) return null;
  const open = MOCKS.map((m) => readStore<Attempt | null>(`attempt:${m.id}`, null)).filter((a): a is Attempt => !!a);
  if (!open.length) return null;
  return (
    <section className="mb-8 rounded-xl border border-accent/50 bg-accent-soft p-4">
      <h2 className="font-semibold text-accent">ทำค้างไว้</h2>
      <ul className="mt-2 space-y-2">
        {open.map((a) => {
          const answered = Object.values(a.answers).filter((x) => x.length).length;
          const left = a.deadline ? Math.max(0, (a.deadline - now) / 1000) : null;
          return (
            <li key={a.attemptId} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-medium">{a.title}</span>
              <span className="text-muted tabular-nums">
                ตอบแล้ว {answered}/{a.questionIds.length}
                {left !== null && ` · เหลือ ${formatDuration(left)}`}
              </span>
              <Link href={`/mock/${a.mockId}/`} className="ml-auto rounded-md bg-accent px-3 py-1 font-medium text-accent-fg">ทำต่อ →</Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function HistoryTable() {
  const history = useStore<HistoryEntry[]>("history", []);
  if (!history.length) return <p className="text-sm text-muted">ยังไม่มีประวัติการสอบ — ผลสอบจะถูกบันทึกในเบราว์เซอร์นี้</p>;
  const trend = history.filter((h) => h.total >= 10).slice(0, 12).reverse();
  return (
    <div className="space-y-4">
      {trend.length >= 2 && <Trend entries={trend} />}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">ชุด</th>
              <th className="px-3 py-2 font-medium">วันที่</th>
              <th className="px-3 py-2 text-right font-medium">คะแนน</th>
              <th className="px-3 py-2 text-right font-medium">เวลา</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {history.slice(0, 15).map((h) => (
              <tr key={h.attemptId} className="border-t border-border">
                <td className="px-3 py-2">{h.title}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted">{new Date(h.finishedAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  <span className={h.passed ? "text-success" : "text-danger"}>{h.passed ? "✓" : "✗"}</span> {h.score}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted">{formatDuration(h.durationSec)}</td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/mock/${h.mockId}/result/?a=${encodeURIComponent(h.attemptId)}`} className="text-accent hover:underline">ดูผล</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
