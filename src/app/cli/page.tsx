import type { Metadata } from "next";
import ComingSoon from "@/components/ComingSoon";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = { title: "VRP CLI Cheatsheet" };

export default function Page() {
  return (
    <>
      <PageHeader title="VRP CLI Cheatsheet" subtitle="คำสั่ง Huawei VRP ที่ใช้บ่อยในการสอบ ค้นหาได้และกรองตามหัวข้อ" />
      <ComingSoon phase={4}>รวมคำสั่ง system-view, display, undo และอื่น ๆ พร้อมตารางเทียบกับ Cisco IOS แยกต่างหาก</ComingSoon>
    </>
  );
}
