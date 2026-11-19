import type { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = { title: "Interactive Labs" };

export default function Page() {
  return (
    <>
      <PageHeader title="Interactive Labs" subtitle="จำลองการทำงานของโปรโตคอลแบบโต้ตอบได้ เพื่อเข้าใจกลไกจริง ไม่ใช่แค่ท่องจำ" />
      <ComingSoon phase={2}>Lab 1 Subnet Drill (Phase 2) · OSPF, STP, VLAN, ACL, NAT (Phase 3) · IPv6 Tool (Phase 4)</ComingSoon>
    </>
  );
}
