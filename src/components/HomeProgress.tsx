"use client";

import Link from "next/link";
import { useState } from "react";
import { InProgress } from "@/components/exam/MockHistory";
import { MODULES } from "@/lib/modules";
import { dueIds, type LessonProgress } from "@/lib/progress";
import type { HistoryEntry, SrsItem } from "@/lib/types";
import { useMounted, useStore } from "@/lib/useStore";

export default function HomeProgress() {
  const mounted = useMounted();
  const lessons = useStore<LessonProgress>("lessons", {});
  const last = useStore<string | null>("lastLesson", null);
  const history = useStore<HistoryEntry[]>("history", []);
  const srs = useStore<Record<string, SrsItem>>("srs", {});
  const [now] = useState(() => Date.now());

  const done = MODULES.filter((m) => lessons[m.slug]?.done).length;
  const lastMod = MODULES.find((m) => m.slug === last);
  const nextMod = MODULES.find((m) => !lessons[m.slug]?.done);
  const fulls = history.filter((h) => h.total >= 50);
  const best = fulls.reduce((b, h) => Math.max(b, h.score), 0);
  const due = dueIds(srs, now).length;
  const pct = Math.round((done / MODULES.length) * 100);

  return (
    <section aria-labelledby="progress-h" className="space-y-4">
      <h2 id="progress-h" className="text-lg font-semibold">ความคืบหน้าของคุณ</h2>
      {mounted && <InProgress />}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-muted">บทเรียนที่อ่านจบ</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {mounted ? done : "–"}
            <span className="text-base font-medium text-muted">/{MODULES.length}</span>
          </p>
          <div className="mt-2 h-2 rounded-full bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="ความคืบหน้าบทเรียน">
            <div className="h-2 rounded-full bg-accent" style={{ width: `${mounted ? pct : 0}%` }} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-muted">Mock Full ที่ทำแล้ว · คะแนนดีสุด</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {mounted ? fulls.length : "–"} <span className="text-base font-medium text-muted">ครั้ง</span>
            {mounted && fulls.length > 0 && (
              <span className={`ml-2 text-base ${best >= 600 ? "text-success" : "text-danger"}`}>
                {best >= 600 ? "✓" : "✗"} {best}
              </span>
            )}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-muted">ข้อที่ถึงรอบทบทวน</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{mounted ? due : "–"}</p>
          {mounted && due > 0 && (
            <Link href="/review/" className="mt-1 inline-block text-sm text-accent hover:underline">
              ไปทบทวน →
            </Link>
          )}
        </div>
      </div>
      <div className="flex min-h-[3rem] flex-wrap gap-2">
        {mounted && lastMod && (
          <Link href={`/lessons/${lastMod.slug}/`} className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm hover:border-accent">
            ↻ อ่านต่อ: <span className="font-medium">{lastMod.id} {lastMod.title}</span>
          </Link>
        )}
        {mounted && nextMod && nextMod !== lastMod && (
          <Link href={`/lessons/${nextMod.slug}/`} className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm hover:border-accent">
            บทถัดไปที่ยังไม่จบ: <span className="font-medium">{nextMod.id} {nextMod.title}</span>
          </Link>
        )}
      </div>
    </section>
  );
}
