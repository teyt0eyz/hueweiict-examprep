import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ResultView from "@/components/exam/ResultView";
import { getMock, MOCKS } from "@/lib/mocks";

export const dynamicParams = false;
export const generateStaticParams = () => MOCKS.map((m) => ({ id: m.id }));

export async function generateMetadata({ params }: PageProps<"/mock/[id]/result">): Promise<Metadata> {
  const { id } = await params;
  return { title: `ผลสอบ · ${getMock(id)?.title ?? ""}`, robots: { index: false } };
}

export default async function ResultPage({ params }: PageProps<"/mock/[id]/result">) {
  const { id } = await params;
  if (!getMock(id)) notFound();
  return <ResultView mockId={id} />;
}
