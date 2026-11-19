import type { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = { title: "Mock Test" };

export default function Page() {
  return (
    <>
      <PageHeader title="Mock Test" subtitle="ฝึกทำข้อสอบเสมือนจริง: Mock Full 60 ข้อ / 90 นาที, Mock by Module 20 ข้อ และ Quick Drill 10 ข้อ" />
      <ComingSoon phase={1}>ระบบทำข้อสอบ จับเวลา ตรวจคำตอบ และหน้าผลสอบวิเคราะห์รายหัวข้อ</ComingSoon>
    </>
  );
}
