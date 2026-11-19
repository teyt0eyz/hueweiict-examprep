import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { LABS } from "@/lib/labs";

export const metadata: Metadata = { title: "Interactive Labs" };

export default function LabsPage() {
  return (
    <>
      <PageHeader title="Interactive Labs" subtitle="จำลองการทำงานของโปรโตคอลแบบโต้ตอบได้ เพื่อเข้าใจกลไกจริง ไม่ใช่แค่ท่องจำ" />
      <ul className="grid gap-4 sm:grid-cols-2">
        {LABS.map((l) => (
          <li key={l.slug}>
            <Link href={`/labs/${l.slug}/`} className="flex h-full flex-col rounded-xl border border-border bg-surface p-5 transition hover:border-accent">
              <span className="font-mono text-xs text-muted">
                Lab {l.no} · {l.module}
              </span>
              <span className="mt-1 font-semibold">{l.title}</span>
              <span className="mt-1 text-sm text-muted">{l.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
