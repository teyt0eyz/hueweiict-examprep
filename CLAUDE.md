@AGENTS.md

# Huawei ICT Competition (Network Track) Prep Site

## Project facts (decided in Phase 0)
- Repo: `hueweiict-examprep` → deploys to `https://teyt0eyz.github.io/hueweiict-examprep/`
- Next.js **16.4** (Turbopack, App Router), Tailwind **v4** (CSS-first config in `src/app/globals.css`, no tailwind.config). Read `node_modules/next/dist/docs/` before using unfamiliar APIs.
- `next.config.ts`: `output: "export"`, `trailingSlash: true`, basePath `/hueweiict-examprep` **only in production** (dev runs at `/`). Cache Components are intentionally OFF (they need a Node server).
- Dynamic routes need `generateStaticParams()` + `export const dynamicParams = false`.
- Internal links: use `next/link` with trailing-slash hrefs (`/lessons/ospf/`). Raw asset URLs must be prefixed with `process.env.NEXT_PUBLIC_BASE_PATH`.
- Theme: class-based (`html.dark`), color tokens in `globals.css` (`bg`, `surface`, `surface-2`, `border`, `fg`, `muted`, `accent`, …). Use the tokens, not raw Tailwind colors.
- localStorage: always via `src/lib/storage.ts` (prefix `hcia:`, try/catch).
- Module list (M1–M17) lives in `src/lib/modules.ts`.
- Source PDFs live in `source/` (gitignored). Read them with `pdftotext -layout -f <start> -l <end>` one chapter at a time.
- Commits are local only; the user pushes to GitHub themselves.

---

# Master Prompt (original spec)

## ROLE
คุณคือ senior frontend engineer + network instructor (ระดับ HCIP-Datacom) ช่วยฉันสร้างเว็บติวสอบ **Huawei ICT Competition — Network Track** แบบ static site deploy ลง **GitHub Pages** (`<username>.github.io/<repo>`)

## GOAL
เว็บที่ใช้ทบทวนเนื้อหา HCIA-Datacom ได้ครบ มี interactive simulation และ **mock test** ที่ทำได้จริง จับเวลา ตรวจคำตอบ มีเฉลยพร้อมคำอธิบาย ใช้ได้ดีทั้งมือถือและ desktop

## SOURCE MATERIAL
อยู่ในโฟลเดอร์ `source/` (ห้าม commit — ใส่ใน `.gitignore`)
1. `Data Communications and Network Technologies` (Huawei, 568 หน้า, 18 บท) → **แหล่งหลัก** (`source/978-981-19-3029-4 (1).pdf`)
2. `Construction, Operation and Maintenance of Network System (Junior)` (380 หน้า) → ใช้เสริมเฉพาะบท 3 (hardware) และบท 5 (VRP/CLI, device login) (`source/978-981-19-3069-0 (1).pdf`)

**กฎลิขสิทธิ์ (สำคัญ):** หนังสือเป็น CC BY-NC-ND → ห้ามคัดลอกข้อความ/รูปจากหนังสือลงเว็บ ให้ **เขียนคำอธิบายใหม่ด้วยภาษาตัวเอง** วาดไดอะแกรมเองด้วย SVG/Mermaid และใส่ credit แหล่งอ้างอิงในหน้า About ข้อสอบทุกข้อต้องแต่งขึ้นใหม่

อ่าน PDF ด้วย `pdftotext -layout` ทีละบท (อย่าโหลดทั้งเล่มเข้า context ทีเดียว)

## TECH STACK
- Next.js (App Router) + TypeScript + Tailwind CSS
- `output: 'export'` (static), ตั้ง `basePath`/`assetPrefix` ตามชื่อ repo, `images.unoptimized: true`
- เนื้อหาบทเรียนเป็น MDX (`content/lessons/*.mdx`), ข้อสอบเป็น JSON (`content/questions/*.json`)
- Mermaid หรือ SVG สำหรับ topology diagram, Shiki สำหรับ syntax highlight คำสั่ง VRP
- ไม่มี backend — เก็บประวัติคะแนน/bookmark ใน `localStorage` (ห่อ try/catch)
- Deploy ผ่าน GitHub Actions (`actions/deploy-pages`) ทุกครั้งที่ push `main`, มีไฟล์ `.nojekyll`

## LANGUAGE & STYLE
- UI และคำอธิบายเป็น **ภาษาไทย** แต่คงศัพท์เทคนิคเป็นอังกฤษ (เช่น "OSPF จะเลือก DR/BDR บน broadcast network")
- คำสั่ง CLI ใช้ syntax **Huawei VRP** เท่านั้น (`system-view`, `display ip routing-table`, `undo`) ห้ามใช้ Cisco IOS ปน — ถ้าเทียบกับ Cisco ให้ทำเป็นตารางแยก
- Dark/light mode, mobile-first, font ไทยอ่านง่าย (เช่น IBM Plex Sans Thai / Noto Sans Thai)

## SITE STRUCTURE
```
/                     หน้าแรก: progress รวม, ไปต่อจากที่ค้าง, ปุ่ม mock test
/lessons              รายการบท จัดกลุ่มตาม module
/lessons/[slug]       บทเรียน + key points + CLI box + quiz ท้ายบท 5 ข้อ
/labs                 interactive simulations
/cli                  VRP command cheatsheet (ค้นหาได้, กรองตามหัวข้อ)
/mock                 เลือก mock test
/mock/[id]            ทำข้อสอบ
/mock/[id]/result     ผลสอบ + เฉลย + วิเคราะห์จุดอ่อนรายหัวข้อ
/review               ข้อที่เคยตอบผิด + ข้อที่ bookmark (spaced review)
/about                แหล่งอ้างอิง + credit
```

## CONTENT MODULES (อิงจากเล่ม 1)
| Module | บทในหนังสือ | น้ำหนัก |
|---|---|---|
| M1 Network Fundamentals & TCP/IP | 1–2 | กลาง |
| M2 VRP & Device Management | 3 (+เล่ม 2 บท 5) | กลาง |
| M3 IP Addressing & Subnetting | 4 | **สูง** |
| M4 Static Routing | 5 | สูง |
| M5 OSPF | 6 | **สูง** |
| M6 Ethernet Switching & VLAN | 7 | **สูง** |
| M7 STP / Link Aggregation / Smart Link | 8 | สูง |
| M8 ACL & AAA | 9 | สูง |
| M9 NAT | 10 | สูง |
| M10 DHCP | 11 | กลาง |
| M11 WLAN | 12 | กลาง |
| M12 IPv6 | 13 | สูง |
| M13 WAN: PPP / PPPoE | 14 | ต่ำ |
| M14 Campus Network Design | 15 | กลาง |
| M15 SNMP / NTP / O&M | 16 | ต่ำ |
| M16 SDN & NFV | 17 | กลาง |
| M17 Network Automation (Python) | 18 | กลาง |

แต่ละบทเรียนต้องมี: วัตถุประสงค์ → อธิบายหลักการ → ไดอะแกรม → ตัวอย่าง config VRP พร้อมคำอธิบายทีละบรรทัด → คำสั่ง `display` ที่ใช้ตรวจสอบ → จุดที่มักออกสอบ / กับดักที่พบบ่อย → mini quiz

## INTERACTIVE LABS (/labs)
1. **Subnet Calculator + Subnetting Drill** — สุ่มโจทย์ VLSM จับเวลา ตรวจคำตอบ (network/broadcast/host range/mask)
2. **OSPF Visualizer** — คลิก router ดู neighbor state machine (Down→Full), DR/BDR election, คำนวณ SPF cost
3. **STP Simulator** — topology 3–4 switch ให้ทาย root bridge / root port / designated port / blocked port แล้วเฉลยแบบ animate
4. **VLAN Frame Tracer** — ติดตาม frame ผ่าน access/trunk/hybrid port ดูว่า tag ถูกใส่/ถอดตรงไหน
5. **ACL Matcher** — ใส่ rule + packet แล้วดูว่า match rule ไหน (เรียงตาม rule ID, implicit deny/permit ตาม context)
6. **NAT Translation Table** — เปรียบเทียบ Static NAT / NAPT / Easy IP / NAT Server
7. **IPv6 Address Tool** — ย่อ/ขยาย address, สร้าง EUI-64, บอกชนิด address

## MOCK TEST — SPEC
**Question schema (`content/questions/<module>.json`):**
```ts
type Question = {
  id: string;            // "m5-ospf-012"
  module: string;        // "M5"
  topic: string;         // "DR/BDR election"
  type: "single" | "multiple" | "truefalse" | "ordering";
  difficulty: 1 | 2 | 3; // 1=HCIA ง่าย, 3=ใกล้ HCIP
  question: string;      // รองรับ markdown + code block
  diagram?: string;      // mermaid หรือ path svg
  options: { id: string; text: string }[];
  answer: string[];      // option id ที่ถูก
  explanation: string;   // อธิบายว่าทำไมถูก และทำไมตัวเลือกอื่นผิด
  ref?: string;          // "Book1 Ch6 §6.2"
};
```

**รูปแบบข้อสอบ (เลียนแบบสนามจริงของ HCIA-Datacom):**
- Mock Full: 60 ข้อ / 90 นาที, คละทุก module ตามน้ำหนักในตาราง, ผ่านที่ 600/1000
- Mock by Module: 20 ข้อ / 30 นาที
- Quick Drill: 10 ข้อสุ่ม ไม่จับเวลา โหมดเฉลยทันที
- ทำ Mock Full แบบ fixed set อย่างน้อย **3 ชุด** + โหมดสุ่มจาก question bank

**ฟีเจอร์ตอนทำข้อสอบ:**
- Timer นับถอยหลัง (หมดเวลาส่งอัตโนมัติ), question navigator grid, flag ข้อไว้ทบทวน
- สลับลำดับข้อและตัวเลือก, multiple-answer ต้องตอบครบถึงได้คะแนน
- บันทึก progress ลง localStorage ระหว่างทำ (รีเฟรชแล้วไม่หาย)
- Keyboard shortcut: 1–5 เลือกคำตอบ, ←/→ เปลี่ยนข้อ, F = flag

**หน้าผลสอบ:**
- คะแนนรวม + ผ่าน/ไม่ผ่าน, เวลาที่ใช้
- กราฟคะแนนแยกตาม module (หาจุดอ่อน) + แนะนำบทที่ควรกลับไปอ่าน
- เฉลยทุกข้อพร้อม explanation, ปุ่ม "ทำเฉพาะข้อที่ผิดอีกรอบ"
- ประวัติการสอบย้อนหลัง (trend)

**Question bank เป้าหมาย:** อย่างน้อย 25 ข้อต่อ module สำหรับ module น้ำหนักสูง และ 15 ข้อสำหรับ module อื่น (รวม ~350+ ข้อ) มีโจทย์คำนวณ subnet, อ่าน output `display`, หา config ที่ผิด และโจทย์ที่ใช้ topology diagram ปนกัน — ไม่ใช่แค่ท่องนิยาม

## QUALITY RULES
- ทุกข้อต้องถูกต้องตาม Huawei VRP และพฤติกรรมของ HCIA-Datacom (เช่น ค่า default ของ OSPF cost reference bandwidth, STP priority, ACL step) — ถ้าไม่มั่นใจ ให้เช็กกับหนังสือใน `source/` แล้วใส่ `ref`
- เขียน script `npm run validate` ตรวจ question JSON: schema ถูก, id ไม่ซ้ำ, `answer` อยู่ใน options จริง, ข้อ single มีคำตอบเดียว, explanation ไม่ว่าง
- Lighthouse mobile ≥ 90, ไม่มี layout shift ตอนเปลี่ยนข้อ
- `npm run build` ต้องผ่านโดยไม่มี error ก่อนจบแต่ละ phase

## WORKFLOW (ทำทีละ phase แล้วหยุดรอฉันตรวจ)
- **Phase 0** — scaffold โปรเจกต์, config static export + basePath, GitHub Actions deploy, layout/nav/theme, ตั้ง `.gitignore` (รวม `source/`) → สรุปให้ฉันว่าต้องตั้งค่าอะไรใน GitHub (Settings → Pages → Source: GitHub Actions)
- **Phase 1** — ระบบ mock test engine + result page + validate script ใช้ข้อสอบตัวอย่าง 10 ข้อก่อน
- **Phase 2** — เนื้อหา M1–M6 + question bank ของ module เหล่านั้น + Lab 1 (subnet)
- **Phase 3** — M7–M12 + Lab 2–6
- **Phase 4** — M13–M17 + Lab 7 + CLI cheatsheet
- **Phase 5** — Mock Full 3 ชุด, หน้า review, polish UI/mobile, ตรวจ accuracy ทั้ง bank รอบสุดท้าย

ทุก phase ให้: วางแผนสั้น ๆ ก่อนเริ่ม → ลงมือ → รัน build + validate → commit ด้วยข้อความที่ชัดเจน → สรุปสิ่งที่ทำ + สิ่งที่ควรตรวจ แล้วรอคำสั่ง "ไป phase ต่อไป"
