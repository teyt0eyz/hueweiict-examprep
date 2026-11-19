import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import ReviewBoard from "@/components/ReviewBoard";

export const metadata: Metadata = { title: "ทบทวน" };

export default function ReviewPage() {
  return (
    <>
      <PageHeader title="ทบทวน" subtitle="ข้อที่เคยตอบผิดและข้อที่ bookmark ไว้ จัดรอบทบทวนแบบ spaced repetition — ข้อมูลเก็บในเบราว์เซอร์นี้เท่านั้น" />
      <ReviewBoard />
    </>
  );
}
