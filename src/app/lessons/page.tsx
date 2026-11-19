import type { Metadata } from "next";
import Link from "next/link";
import { LessonBadge } from "@/components/lesson/LessonTracker";
import PageHeader from "@/components/PageHeader";
import { GROUPS, MODULES, WEIGHT_LABEL, type Module } from "@/lib/modules";

export const metadata: Metadata = { title: "บทเรียน" };

const weightClass: Record<Module["weight"], string> = {
  low: "bg-surface-2 text-muted",
  mid: "bg-surface-2 text-fg",
  high: "bg-accent-soft text-accent",
  critical: "bg-accent text-accent-fg",
};

export default function LessonsPage() {
  const groups = Object.keys(GROUPS) as Module["group"][];
  return (
    <>
      <PageHeader title="บทเรียน" subtitle="จัดกลุ่มตาม module อิงโครงสร้าง HCIA-Datacom — ป้ายน้ำหนักบอกว่าหัวข้อไหนออกสอบบ่อย" />
      <div className="space-y-10">
        {groups.map((g) => (
          <section key={g} aria-labelledby={`g-${g}`}>
            <h2 id={`g-${g}`} className="mb-3 text-lg font-semibold">{GROUPS[g]}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {MODULES.filter((m) => m.group === g).map((m) => (
                <li key={m.id}>
                  <Link href={`/lessons/${m.slug}/`} className="flex h-full flex-col rounded-xl border border-border bg-surface p-4 transition hover:border-accent">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-muted">{m.id} · บท {m.chapters}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${weightClass[m.weight]}`}>น้ำหนัก{WEIGHT_LABEL[m.weight]}</span>
                    </div>
                    <h3 className="mt-2 font-medium">{m.title}</h3>
                    <p className="text-sm text-muted">{m.titleTh}</p>
                    <span className="mt-auto pt-2"><LessonBadge slug={m.slug} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
