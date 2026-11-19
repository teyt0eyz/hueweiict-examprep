import { MODULES } from "./modules";
import type { MockDef } from "./types";

/** Questions per module in a 60-question full mock (sums to 60), weighted by exam importance. */
export const FULL_QUOTA: Record<string, number> = {
  M1: 3, M2: 3, M3: 6, M4: 4, M5: 6, M6: 6, M7: 4, M8: 4, M9: 4,
  M10: 3, M11: 3, M12: 4, M13: 2, M14: 2, M15: 2, M16: 2, M17: 2,
};

export const PASS_SCORE = 600;

export const MOCKS: MockDef[] = [
  { id: "full-1", kind: "full", title: "Mock Full ชุดที่ 1", desc: "60 ข้อ · 90 นาที · ชุดข้อสอบคงที่ คละทุก module ตามน้ำหนัก", count: 60, minutes: 90, instant: false },
  { id: "full-2", kind: "full", title: "Mock Full ชุดที่ 2", desc: "60 ข้อ · 90 นาที · ชุดข้อสอบคงที่ ไม่ซ้ำกับชุดที่ 1", count: 60, minutes: 90, instant: false },
  { id: "full-3", kind: "full", title: "Mock Full ชุดที่ 3", desc: "60 ข้อ · 90 นาที · ชุดข้อสอบคงที่ ไม่ซ้ำกับชุดที่ 1–2", count: 60, minutes: 90, instant: false },
  { id: "full-random", kind: "full-random", title: "Mock Full แบบสุ่ม", desc: "60 ข้อ · 90 นาที · สุ่มใหม่จาก question bank ทุกครั้ง ตามสัดส่วนน้ำหนัก", count: 60, minutes: 90, instant: false },
  { id: "drill", kind: "drill", title: "Quick Drill", desc: "10 ข้อสุ่ม · ไม่จับเวลา · เฉลยทันทีหลังตอบแต่ละข้อ", count: 10, minutes: null, instant: true },
  ...MODULES.map<MockDef>((m) => ({
    id: m.id.toLowerCase(),
    kind: "module",
    title: `${m.id} ${m.title}`,
    desc: "20 ข้อ · 30 นาที",
    count: 20,
    minutes: 30,
    instant: false,
    module: m.id,
  })),
  { id: "retry", kind: "retry", title: "ทำข้อที่ผิดอีกรอบ", desc: "เฉพาะข้อที่ตอบผิดจากการสอบครั้งล่าสุด · ไม่จับเวลา", count: 0, minutes: null, instant: false },
  { id: "review", kind: "review", title: "ทบทวน (Spaced Review)", desc: "ข้อที่ถึงรอบทบทวน · เฉลยทันที", count: 0, minutes: null, instant: true },
];

export const getMock = (id: string) => MOCKS.find((m) => m.id === id);
