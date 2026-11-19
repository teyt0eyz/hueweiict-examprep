import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import LabHost from "@/components/labs/LabHost";
import { getLab, LABS } from "@/lib/labs";
import { MODULES } from "@/lib/modules";

export const dynamicParams = false;
export const generateStaticParams = () => LABS.map((l) => ({ slug: l.slug }));

export async function generateMetadata({ params }: PageProps<"/labs/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const l = getLab(slug);
  return { title: l ? `Lab ${l.no}: ${l.title}` : "Lab", description: l?.desc };
}

export default async function LabPage({ params }: PageProps<"/labs/[slug]">) {
  const { slug } = await params;
  const lab = getLab(slug);
  if (!lab) notFound();
  const mod = MODULES.find((m) => m.id === lab.module);
  return (
    <>
      <nav className="mb-4 text-sm text-muted" aria-label="breadcrumb">
        <Link href="/labs/" className="hover:text-fg">Labs</Link> / Lab {lab.no}
      </nav>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Lab {lab.no}: {lab.title}
        </h1>
        <p className="mt-1 text-muted">{lab.desc}</p>
        {mod && (
          <p className="mt-2 text-sm">
            บทเรียนที่เกี่ยวข้อง:{" "}
            <Link href={`/lessons/${mod.slug}/`} className="text-accent hover:underline">
              {mod.id} {mod.title}
            </Link>
          </p>
        )}
      </header>
      <LabHost slug={slug} />
    </>
  );
}
