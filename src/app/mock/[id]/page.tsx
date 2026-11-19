import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ExamRunner from "@/components/exam/ExamRunner";
import { getMock, MOCKS } from "@/lib/mocks";

export const dynamicParams = false;
export const generateStaticParams = () => MOCKS.map((m) => ({ id: m.id }));

export async function generateMetadata({ params }: PageProps<"/mock/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: getMock(id)?.title ?? "Mock Test", robots: { index: false } };
}

export default async function MockPage({ params }: PageProps<"/mock/[id]">) {
  const { id } = await params;
  if (!getMock(id)) notFound();
  return <ExamRunner mockId={id} />;
}
