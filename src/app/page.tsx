import Link from "next/link";
import HomeProgress from "@/components/HomeProgress";
import { MODULES } from "@/lib/modules";

const QUICK = [
  { href: "/lessons/", title: "บทเรียน", desc: `${MODULES.length} modules ครอบคลุม HCIA-Datacom` },
  { href: "/labs/", title: "Interactive Labs", desc: "Subnet drill, OSPF, STP, VLAN, ACL, NAT, IPv6" },
  { href: "/cli/", title: "VRP CLI Cheatsheet", desc: "คำสั่ง Huawei VRP ค้นหาและกรองตามหัวข้อได้" },
  { href: "/review/", title: "ทบทวน", desc: "ข้อที่เคยตอบผิดและข้อที่ bookmark ไว้" },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-border bg-surface p-6 sm:p-10">
        <p className="text-sm font-medium text-accent">Huawei ICT Competition · Network Track</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">ติวสอบ HCIA-Datacom ให้พร้อมลงสนาม</h1>
        <p className="mt-3 max-w-2xl text-muted">
          ทบทวนเนื้อหาครบทุก module, ลองทำ lab แบบ interactive และฝึกทำ mock test จับเวลาพร้อมเฉลยละเอียด
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/mock/" className="rounded-lg bg-accent px-5 py-2.5 font-medium text-accent-fg hover:opacity-90">
            เริ่ม Mock Test
          </Link>
          <Link href="/lessons/" className="rounded-lg border border-border px-5 py-2.5 font-medium hover:bg-surface-2">
            ดูบทเรียน
          </Link>
        </div>
      </section>

      <HomeProgress />

      <section className="grid gap-4 sm:grid-cols-2">
        {QUICK.map((q) => (
          <Link key={q.href} href={q.href} className="rounded-xl border border-border bg-surface p-5 transition hover:border-accent">
            <h2 className="font-semibold">{q.title}</h2>
            <p className="mt-1 text-sm text-muted">{q.desc}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
