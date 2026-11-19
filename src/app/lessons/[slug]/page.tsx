import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";
import LessonQuiz from "@/components/lesson/LessonQuiz";
import { LessonDoneButton, LessonVisit } from "@/components/lesson/LessonTracker";
import { pickLessonQuiz } from "@/lib/lessons";
import { getModuleBySlug, MODULES, WEIGHT_LABEL } from "@/lib/modules";

export const dynamicParams = false;

export function generateStaticParams() {
  return MODULES.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: PageProps<"/lessons/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const m = getModuleBySlug(slug);
  return { title: m ? `${m.id} ${m.title}` : "บทเรียน", description: m ? `บทเรียน ${m.title} (${m.titleTh}) สำหรับเตรียมสอบ HCIA-Datacom` : undefined };
}

export default async function LessonPage({ params }: PageProps<"/lessons/[slug]">) {
  const { slug } = await params;
  const m = getModuleBySlug(slug);
  if (!m) notFound();
  const idx = MODULES.indexOf(m);
  const prev = MODULES[idx - 1];
  const next = MODULES[idx + 1];

  const Content = (await import(`../../../../content/lessons/${slug}.mdx`)).default as ComponentType;
  const quiz = pickLessonQuiz(m.id);

  return (
    <div className="mx-auto max-w-3xl">
      <LessonVisit slug={slug} />
      <nav className="mb-4 text-sm text-muted" aria-label="breadcrumb">
        <Link href="/lessons/" className="hover:text-fg">บทเรียน</Link> / {m.id}
      </nav>
      <header className="mb-8">
        <p className="font-mono text-sm text-accent">
          {m.id} · Book 1 บท {m.chapters} · น้ำหนัก{WEIGHT_LABEL[m.weight]}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{m.title}</h1>
        <p className="mt-1 text-lg text-muted">{m.titleTh}</p>
        <div className="mt-4">
          <LessonDoneButton slug={slug} />
        </div>
      </header>

      <div className="prose max-w-none prose-headings:scroll-mt-20 prose-h2:mt-12 prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-h3:mt-8">
        <Content />
      </div>

      <LessonQuiz questions={quiz} mockId={m.id.toLowerCase()} />

      <nav className="mt-12 grid gap-3 border-t border-border pt-6 sm:grid-cols-2" aria-label="บทก่อนหน้าและถัดไป">
        {prev ? (
          <Link href={`/lessons/${prev.slug}/`} className="rounded-xl border border-border bg-surface p-4 hover:border-accent">
            <span className="text-xs text-muted">← บทก่อนหน้า</span>
            <span className="mt-1 block font-medium">{prev.id} {prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/lessons/${next.slug}/`} className="rounded-xl border border-border bg-surface p-4 text-right hover:border-accent">
            <span className="text-xs text-muted">บทถัดไป →</span>
            <span className="mt-1 block font-medium">{next.id} {next.title}</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
