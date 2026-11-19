import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = { title: "เกี่ยวกับ" };

export default function AboutPage() {
  return (
    <>
      <PageHeader title="เกี่ยวกับเว็บนี้" subtitle="เว็บติวส่วนตัวสำหรับเตรียมสอบ Huawei ICT Competition สาย Network (ระดับ HCIA-Datacom)" />
      <div className="prose prose-neutral max-w-none dark:prose-invert">
        <h2>แหล่งอ้างอิง</h2>
        <ul>
          <li>
            Huawei Technologies Co., Ltd. <em>Data Communications and Network Technologies</em>. Springer, 2023.
            ISBN 978-981-19-3029-4. เผยแพร่แบบ Open Access ภายใต้สัญญาอนุญาต CC BY-NC-ND 4.0
          </li>
          <li>
            Huawei Technologies Co., Ltd. <em>Construction, Operation and Maintenance of Network System (Junior)</em>.
            Springer, 2023. ISBN 978-981-19-3069-0. เผยแพร่แบบ Open Access ภายใต้สัญญาอนุญาต CC BY-NC-ND 4.0
          </li>
        </ul>
        <h2>เรื่องลิขสิทธิ์</h2>
        <p>
          เนื้อหา คำอธิบาย ไดอะแกรม และข้อสอบทั้งหมดในเว็บนี้เขียนและวาดขึ้นใหม่ ไม่ได้คัดลอกข้อความหรือรูปภาพจากหนังสือ
          หนังสือข้างต้นใช้เป็นแหล่งอ้างอิงเพื่อตรวจความถูกต้องเท่านั้น โดยระบุตำแหน่งอ้างอิง (เช่น “Book1 Ch6”) ไว้ในเฉลยแต่ละข้อ
        </p>
        <p>
          เว็บนี้ไม่ได้มีส่วนเกี่ยวข้องหรือได้รับการรับรองจาก Huawei ชื่อ Huawei, HCIA และ VRP เป็นเครื่องหมายการค้าของเจ้าของ
        </p>
        <h2>ความเป็นส่วนตัว</h2>
        <p>ไม่มี backend และไม่มีการเก็บข้อมูลผู้ใช้ ประวัติคะแนนและ bookmark ถูกเก็บใน localStorage ของเบราว์เซอร์คุณเท่านั้น</p>
      </div>
    </>
  );
}
