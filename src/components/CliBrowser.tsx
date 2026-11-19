"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { MODULES } from "@/lib/modules";

export type CliItem = { group: string; module: string; cmd: string; desc: string; html: string };

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ");

export default function CliBrowser({ items }: { items: CliItem[] }) {
  const groups = useMemo(() => [...new Set(items.map((i) => i.group))], [items]);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const dq = useDeferredValue(q);

  const shown = useMemo(() => {
    const terms = norm(dq).split(" ").filter(Boolean);
    return items.filter((i) => (!group || i.group === group) && terms.every((t) => norm(`${i.cmd} ${i.desc} ${i.group}`).includes(t)));
  }, [items, dq, group]);

  const byGroup = groups.map((g) => [g, shown.filter((i) => i.group === g)] as const).filter(([, list]) => list.length > 0);

  return (
    <div>
      <div className="sticky top-14 z-10 -mx-4 mb-5 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-4">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหา เช่น ospf peer, trunk allow, nat outbound, display"
          aria-label="ค้นหาคำสั่ง"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="กรองตามหัวข้อ">
          <button type="button" aria-pressed={group === null} onClick={() => setGroup(null)} className={`shrink-0 rounded-full border px-3 py-1 text-xs ${group === null ? "border-accent bg-accent-soft text-accent" : "border-border"}`}>
            ทั้งหมด
          </button>
          {groups.map((g) => (
            <button key={g} type="button" aria-pressed={group === g} onClick={() => setGroup(group === g ? null : g)} className={`shrink-0 rounded-full border px-3 py-1 text-xs ${group === g ? "border-accent bg-accent-soft text-accent" : "border-border"}`}>
              {g}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-4 text-sm text-muted" aria-live="polite">{shown.length} คำสั่ง</p>

      {byGroup.map(([g, list]) => {
        const mod = MODULES.find((m) => m.id === list[0].module);
        return (
          <section key={g} className="mb-8">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">{g}</h2>
              {mod && (
                <Link href={`/lessons/${mod.slug}/`} className="text-xs text-accent hover:underline">
                  บทเรียน {mod.id} →
                </Link>
              )}
            </div>
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
              {list.map((i) => (
                <li key={i.cmd} className="cli-row grid gap-1 p-3 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-center md:gap-4">
                  <div className="min-w-0 overflow-x-auto" dangerouslySetInnerHTML={{ __html: i.html }} />
                  <p className="text-sm text-muted">{i.desc}</p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {shown.length === 0 && <p className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">ไม่พบคำสั่งที่ตรงกับ “{q}”</p>}
    </div>
  );
}
