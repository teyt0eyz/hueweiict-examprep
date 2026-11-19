import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ComingSoon from "@/components/ComingSoon";
import PageHeader from "@/components/PageHeader";
import { getModuleBySlug, MODULES } from "@/lib/modules";

export const dynamicParams = false;

export function generateStaticParams() {
  return MODULES.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: PageProps<"/lessons/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const m = getModuleBySlug(slug);
  return { title: m ? `${m.id} ${m.title}` : "บทเรียน" };
}

export default async function LessonPage({ params }: PageProps<"/lessons/[slug]">) {
  const { slug } = await params;
  const m = getModuleBySlug(slug);
  if (!m) notFound();
  return (
    <>
      <nav className="mb-4 text-sm text-muted">
        <Link href="/lessons/" className="hover:text-fg">บทเรียน</Link> / {m.id}
      </nav>
      <PageHeader title={`${m.id} · ${m.title}`} subtitle={`${m.titleTh} — อ้างอิงเล่ม 1 บท ${m.chapters}`} />
      <ComingSoon phase={m.phase}>
        บทเรียนจะประกอบด้วย: วัตถุประสงค์ → หลักการ → ไดอะแกรม → ตัวอย่าง config VRP → คำสั่ง display → จุดที่มักออกสอบ → mini quiz 5 ข้อ
      </ComingSoon>
    </>
  );
}
