import type { Metadata } from "next";
import Link from "next/link";
import { HistoryTable, InProgress } from "@/components/exam/MockHistory";
import PageHeader from "@/components/PageHeader";
import { MOCKS } from "@/lib/mocks";

export const metadata: Metadata = { title: "Mock Test" };

export default function MockIndex() {
  const full = MOCKS.filter((m) => m.kind === "full" || m.kind === "full-random");
  const drill = MOCKS.filter((m) => m.kind === "drill");
  const mods = MOCKS.filter((m) => m.kind === "module");
  return (
    <>
      <PageHeader title="Mock Test" subtitle="รูปแบบเดียวกับ HCIA-Datacom: 60 ข้อ / 90 นาที ผ่านที่ 600/1000 — มีทั้ง single, multiple, true/false และ ordering" />
      <InProgress />

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Mock Full</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {[...full, ...drill].map((m) => (
            <li key={m.id}>
              <Link href={`/mock/${m.id}/`} className="block h-full rounded-xl border border-border bg-surface p-4 transition hover:border-accent">
                <p className="font-semibold">{m.title}</p>
                <p className="mt-1 text-sm text-muted">{m.desc}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold">Mock by Module</h2>
        <p className="mb-3 text-sm text-muted">20 ข้อ / 30 นาที สุ่มจาก module ที่เลือก</p>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {mods.map((m) => (
            <li key={m.id}>
              <Link href={`/mock/${m.id}/`} className="block rounded-lg border border-border bg-surface px-3 py-2.5 text-sm transition hover:border-accent">
                {m.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">ประวัติการสอบ</h2>
        <HistoryTable />
      </section>
    </>
  );
}
