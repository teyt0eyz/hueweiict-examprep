export type LabDef = { slug: string; no: number; title: string; desc: string; module: string };

export const LABS: LabDef[] = [
  { slug: "subnet", no: 1, title: "Subnet Calculator + Drill", desc: "คำนวณ subnet และฝึกทำโจทย์ subnet/VLSM แบบจับเวลา", module: "M3" },
  { slug: "ospf", no: 2, title: "OSPF Visualizer", desc: "neighbor state machine, DR/BDR election และคำนวณ SPF cost", module: "M5" },
  { slug: "stp", no: 3, title: "STP Simulator", desc: "ทาย root bridge, root port, designated port และ blocked port", module: "M7" },
  { slug: "vlan", no: 4, title: "VLAN Frame Tracer", desc: "ติดตาม frame ผ่าน access/trunk/hybrid ว่า tag ถูกใส่หรือถอดที่ไหน", module: "M6" },
  { slug: "acl", no: 5, title: "ACL Matcher", desc: "ใส่ rule กับ packet แล้วดูว่า match rule ใด รวมถึง default action", module: "M8" },
  { slug: "nat", no: 6, title: "NAT Translation Table", desc: "เปรียบเทียบ Static NAT, NAPT, Easy IP และ NAT Server", module: "M9" },
  { slug: "ipv6", no: 7, title: "IPv6 Address Tool", desc: "ย่อ/ขยาย address, สร้าง EUI-64 และบอกชนิด address", module: "M12" },
];

export const getLab = (slug: string) => LABS.find((l) => l.slug === slug);
