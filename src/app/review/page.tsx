import type { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = { title: "ทบทวน" };

export default function Page() {
  return (
    <>
      <PageHeader title="ทบทวน" subtitle="รวมข้อที่เคยตอบผิดและข้อที่ bookmark ไว้ เพื่อทบทวนแบบ spaced review" />
      <ComingSoon phase={5}>ข้อมูลจะถูกเก็บในเบราว์เซอร์ของคุณ (localStorage) เท่านั้น</ComingSoon>
    </>
  );
}
