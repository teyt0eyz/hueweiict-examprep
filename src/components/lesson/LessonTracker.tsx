"use client";

import { useEffect } from "react";
import { markLessonVisited, setLessonDone, type LessonProgress } from "@/lib/progress";
import { useStore } from "@/lib/useStore";

export function LessonVisit({ slug }: { slug: string }) {
  useEffect(() => markLessonVisited(slug), [slug]);
  return null;
}

export function LessonDoneButton({ slug }: { slug: string }) {
  const progress = useStore<LessonProgress>("lessons", {});
  const done = !!progress[slug]?.done;
  return (
    <button
      type="button"
      onClick={() => setLessonDone(slug, !done)}
      aria-pressed={done}
      className={`min-w-[11rem] rounded-lg border px-4 py-2 text-sm font-medium ${done ? "border-success bg-success/10 text-success" : "border-border hover:bg-surface-2"}`}
    >
      {done ? "✓ อ่านจบแล้ว" : "ทำเครื่องหมายว่าอ่านจบ"}
    </button>
  );
}

export function LessonBadge({ slug }: { slug: string }) {
  const progress = useStore<LessonProgress>("lessons", {});
  const p = progress[slug];
  if (!p) return null;
  return <span className={`text-xs ${p.done ? "text-success" : "text-muted"}`}>{p.done ? "✓ อ่านจบ" : "เปิดอ่านแล้ว"}</span>;
}
