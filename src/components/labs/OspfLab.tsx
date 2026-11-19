"use client";

import { useMemo, useState } from "react";
import { toInt } from "@/lib/ipv4";
import { Chip, Panel, Tabs } from "./ui";

// ------------------------------------------------------------ neighbor FSM
const STATES = ["Down", "Init", "2-Way", "ExStart", "Exchange", "Loading", "Full"] as const;
type Fault = "none" | "area" | "hello" | "auth" | "mask" | "drother";
const FAULTS: Record<Fault, string> = {
  none: "ปกติ",
  area: "area ID ไม่ตรงกัน",
  hello: "hello/dead interval ไม่ตรงกัน",
  auth: "authentication ไม่ตรงกัน",
  mask: "subnet mask ไม่ตรงกัน (broadcast)",
  drother: "ทั้งคู่เป็น DROther",
};

type Ev = { dir: "→" | "←" | "↔"; pkt: string; state: number; text: string };
const EVENTS: Ev[] = [
  { dir: "↔", pkt: "—", state: 0, text: "เริ่มต้น: ยังไม่ได้รับ Hello จาก neighbor" },
  { dir: "→", pkt: "Hello (224.0.0.5)", state: 1, text: "R2 ได้รับ Hello จาก R1 แต่ในนั้นยังไม่มี router ID ของ R2 → R2 มองว่า R1 อยู่สถานะ Init" },
  { dir: "←", pkt: "Hello (neighbor: 1.1.1.1)", state: 2, text: "R2 ตอบ Hello ที่มี RID ของ R1 → เห็นกันและกัน = 2-Way · บน broadcast network จะเลือก DR/BDR ที่ขั้นนี้" },
  { dir: "↔", pkt: "DD (ว่าง, I/M/MS bit)", state: 3, text: "ExStart: แลก DD ว่างเพื่อเลือก master/slave — router ID สูงกว่าเป็น master และกำหนด DD sequence number" },
  { dir: "↔", pkt: "DD (LSA headers)", state: 4, text: "Exchange: ส่ง DD ที่มีสรุป LSA header ของ LSDB ให้กัน" },
  { dir: "↔", pkt: "LSR → LSU → LSAck", state: 5, text: "Loading: ขอ LSA ที่ตัวเองยังไม่มีด้วย LSR ได้ LSA เต็มใน LSU แล้วตอบรับด้วย LSAck" },
  { dir: "↔", pkt: "—", state: 6, text: "Full: LSDB ตรงกันแล้ว (adjacency สมบูรณ์) พร้อมคำนวณ SPF" },
];

function faultStop(f: Fault): { at: number; text: string } | null {
  switch (f) {
    case "area":
    case "hello":
    case "auth":
    case "mask":
      return { at: 1, text: `Hello ถูกทิ้งเพราะ${FAULTS[f]} → ค้างที่ Down (ไม่ขึ้นใน display ospf peer เลย) · ตรวจด้วย display ospf error / display ospf interface` };
    case "drother":
      return { at: 3, text: "DROther กับ DROther จะหยุดที่ 2-Way — เป็นเรื่องปกติ ไม่ใช่ปัญหา (DROther จะ Full กับ DR/BDR เท่านั้น)" };
    default:
      return null;
  }
}

function NeighborFsm() {
  const [fault, setFault] = useState<Fault>("none");
  const [i, setI] = useState(0);
  const stop = faultStop(fault);
  const maxI = stop ? stop.at - 1 : EVENTS.length - 1;
  const stuck = stop !== null && i === maxI && i < EVENTS.length - 1;
  const ev = EVENTS[i];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(FAULTS) as Fault[]).map((f) => (
          <Chip key={f} active={fault === f} onClick={() => { setFault(f); setI(0); }}>{FAULTS[f]}</Chip>
        ))}
      </div>
      <Panel>
        <div className="flex items-center justify-between gap-2">
          <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-center text-sm"><b>R1</b><br /><span className="text-xs text-muted">RID 1.1.1.1</span></div>
          <div className="flex-1 text-center">
            <p className="font-mono text-xs text-accent">{ev.pkt}</p>
            <p className="text-2xl leading-none text-accent" aria-hidden>{ev.dir}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-center text-sm"><b>R2</b><br /><span className="text-xs text-muted">RID 2.2.2.2</span></div>
        </div>
        <ol className="mt-4 flex flex-wrap gap-1" aria-label="neighbor states">
          {STATES.map((s, k) => (
            <li key={s} className={`rounded px-2 py-1 font-mono text-xs ${k === ev.state ? (stuck ? "bg-danger text-white" : "bg-accent text-accent-fg") : k < ev.state ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted"}`}>{s}</li>
          ))}
        </ol>
        <p className="mt-3 text-sm" aria-live="polite">{ev.text}</p>
        {stuck && <p className="mt-2 rounded-lg bg-danger/10 p-3 text-sm text-danger">{stop!.text}</p>}
        <div className="mt-4 flex gap-2">
          <button type="button" disabled={i === 0} onClick={() => setI(i - 1)} className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40">← ก่อนหน้า</button>
          <button type="button" disabled={i >= maxI} onClick={() => setI(i + 1)} className="rounded-md bg-accent px-3 py-1.5 text-sm text-accent-fg disabled:opacity-40">ขั้นถัดไป →</button>
        </div>
        {fault !== "none" && fault !== "drother" && (
          <p className="mt-3 text-xs text-muted">พารามิเตอร์ที่ต้องตรงกันจึงเป็น neighbor ได้: area ID, hello/dead interval, authentication, subnet mask (บน broadcast/NBMA), stub flag</p>
        )}
      </Panel>
    </div>
  );
}

// ------------------------------------------------------------ DR/BDR
type Rt = { id: string; pri: number; rid: string };
const ridNum = (r: string) => toInt(r) ?? 0;
const better = (a: Rt, b: Rt) => (a.pri !== b.pri ? b.pri - a.pri : ridNum(b.rid) - ridNum(a.rid));
function elect(rs: Rt[], exclude: string[] = []) {
  const cands = rs.filter((r) => r.pri > 0 && !exclude.includes(r.id)).sort(better);
  return cands[0]?.id ?? null;
}

function DrElection() {
  const [rs, setRs] = useState<Rt[]>([
    { id: "R1", pri: 1, rid: "1.1.1.1" },
    { id: "R2", pri: 1, rid: "2.2.2.2" },
    { id: "R3", pri: 10, rid: "3.3.3.3" },
    { id: "R4", pri: 0, rid: "4.4.4.4" },
  ]);
  const fresh = (list: Rt[]) => {
    const dr = elect(list);
    return { dr, bdr: elect(list, dr ? [dr] : []) };
  };
  const [roles, setRoles] = useState(() => fresh(rs));
  const [note, setNote] = useState("เลือกตาม priority สูงสุด (0 = ไม่มีสิทธิ์) ถ้าเท่ากันใช้ router ID สูงสุด");

  const update = (id: string, patch: Partial<Rt>) => {
    const next = rs.map((r) => (r.id === id ? { ...r, ...patch } : r));
    setRs(next);
    setRoles(fresh(next));
    setNote("เปลี่ยนค่าแล้วเลือกใหม่ทั้งหมด (ในอุปกรณ์จริงต้อง reset ospf process ก่อนจึงมีผล เพราะ DR ไม่ถูกแย่ง)");
  };
  const fail = (which: "dr" | "bdr") => {
    const gone = roles[which];
    if (!gone) return;
    const left = rs.filter((r) => r.id !== gone);
    setRs(left);
    if (which === "dr") {
      const dr = roles.bdr;
      setRoles({ dr, bdr: elect(left, dr ? [dr] : []) });
      setNote(`${gone} (DR) ล่ม → BDR เดิม ${dr ?? "-"} ขึ้นเป็น DR ทันที แล้วเลือก BDR ใหม่จากที่เหลือ`);
    } else {
      setRoles({ dr: roles.dr, bdr: elect(left, roles.dr ? [roles.dr] : []) });
      setNote(`${gone} (BDR) ล่ม → เลือก BDR ใหม่ DR เดิมไม่เปลี่ยน`);
    }
  };
  const addHigh = () => {
    if (rs.some((r) => r.id === "R5")) return;
    setRs([...rs, { id: "R5", pri: 255, rid: "9.9.9.9" }]);
    setNote("R5 (priority 255) เข้ามาทีหลัง แต่ DR/BDR **ไม่ถูกแย่ง** (non-preemptive) R5 เป็น DROther จนกว่า DR/BDR จะล่ม");
  };
  const reset = () => {
    const base: Rt[] = [
      { id: "R1", pri: 1, rid: "1.1.1.1" }, { id: "R2", pri: 1, rid: "2.2.2.2" },
      { id: "R3", pri: 10, rid: "3.3.3.3" }, { id: "R4", pri: 0, rid: "4.4.4.4" },
    ];
    setRs(base); setRoles(fresh(base)); setNote("รีเซ็ตแล้ว — ทุกตัวเริ่มพร้อมกัน");
  };

  const roleOf = (id: string) => (id === roles.dr ? "DR" : id === roles.bdr ? "BDR" : "DROther");
  return (
    <div className="space-y-4">
      <Panel title="Broadcast segment 10.0.0.0/24">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {rs.map((r) => {
            const role = roleOf(r.id);
            return (
              <div key={r.id} className={`rounded-lg border p-3 ${role === "DR" ? "border-accent bg-accent-soft" : role === "BDR" ? "border-success" : "border-border"}`}>
                <div className="flex items-center justify-between">
                  <b>{r.id}</b>
                  <span className={`text-xs font-semibold ${role === "DR" ? "text-accent" : role === "BDR" ? "text-success" : "text-muted"}`}>{role}</span>
                </div>
                <label className="mt-2 block text-xs text-muted">priority
                  <input type="number" min={0} max={255} value={r.pri} onChange={(e) => update(r.id, { pri: Math.max(0, Math.min(255, Number(e.target.value) || 0)) })} className="w-full rounded border border-border bg-surface px-2 py-1 font-mono text-xs" />
                </label>
                <label className="mt-1 block text-xs text-muted">router ID
                  <input value={r.rid} onChange={(e) => update(r.id, { rid: e.target.value })} className="w-full rounded border border-border bg-surface px-2 py-1 font-mono text-xs" />
                </label>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-sm" aria-live="polite">{note.replace(/\*\*/g, "")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => fail("dr")} disabled={!roles.dr} className="rounded-md border border-danger px-3 py-1.5 text-sm text-danger disabled:opacity-40">DR ล่ม</button>
          <button type="button" onClick={() => fail("bdr")} disabled={!roles.bdr} className="rounded-md border border-danger px-3 py-1.5 text-sm text-danger disabled:opacity-40">BDR ล่ม</button>
          <button type="button" onClick={addHigh} disabled={rs.some((r) => r.id === "R5")} className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40">+ R5 priority 255</button>
          <button type="button" onClick={reset} className="rounded-md border border-border px-3 py-1.5 text-sm">รีเซ็ต</button>
        </div>
        <p className="mt-3 text-xs text-muted">priority default = 1 · ตั้งด้วย <code>ospf dr-priority &lt;0-255&gt;</code> ใน interface view · DROther สร้าง adjacency (Full) กับ DR/BDR เท่านั้น ส่วนกันเองค้างที่ 2-Way</p>
      </Panel>
    </div>
  );
}

// ------------------------------------------------------------ SPF
type Bw = 10 | 100 | 1000 | 10000;
const BW_LABEL: Record<Bw, string> = { 10: "10M", 100: "100M", 1000: "1G", 10000: "10G" };
const NODES: Record<string, { x: number; y: number }> = { R1: { x: 60, y: 150 }, R2: { x: 220, y: 55 }, R3: { x: 220, y: 245 }, R4: { x: 400, y: 55 }, R5: { x: 400, y: 245 }, R6: { x: 540, y: 150 } };
const BASE_LINKS: { a: string; b: string; bw: Bw }[] = [
  { a: "R1", b: "R2", bw: 1000 }, { a: "R1", b: "R3", bw: 100 }, { a: "R2", b: "R4", bw: 10 },
  { a: "R2", b: "R3", bw: 100 }, { a: "R3", b: "R5", bw: 1000 }, { a: "R4", b: "R6", bw: 1000 },
  { a: "R5", b: "R6", bw: 100 }, { a: "R4", b: "R5", bw: 10000 },
];

function SpfCost() {
  const [links, setLinks] = useState(BASE_LINKS);
  const [ref, setRef] = useState<Bw>(100);
  const cost = (bw: Bw) => Math.max(1, Math.floor(ref / bw));
  const res = useMemo(() => {
    const ids = Object.keys(NODES);
    const dist = new Map(ids.map((i) => [i, i === "R1" ? 0 : Infinity]));
    const preds = new Map<string, number[]>(ids.map((i) => [i, []]));
    const done = new Set<string>();
    while (done.size < ids.length) {
      const u = ids.filter((i) => !done.has(i)).sort((a, b) => dist.get(a)! - dist.get(b)!)[0];
      done.add(u);
      links.forEach((l, li) => {
        if (l.a !== u && l.b !== u) return;
        const v = l.a === u ? l.b : l.a;
        const d = dist.get(u)! + Math.max(1, Math.floor(ref / l.bw));
        if (d < dist.get(v)!) { dist.set(v, d); preds.set(v, [li]); }
        else if (d === dist.get(v)! && !done.has(v)) preds.get(v)!.push(li);
      });
    }
    const tree = new Set<number>();
    for (const p of preds.values()) p.forEach((x) => tree.add(x));
    const paths = (n: string): string[] => {
      if (n === "R1") return ["R1"];
      return preds.get(n)!.flatMap((li) => {
        const l = links[li];
        const prev = l.a === n ? l.b : l.a;
        return paths(prev).map((p) => `${p} → ${n}`);
      });
    };
    return { dist, tree, paths };
  }, [links, ref]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm">bandwidth-reference:</span>
        {([100, 1000, 10000] as Bw[]).map((r) => (
          <Chip key={r} active={ref === r} onClick={() => setRef(r)}>{r} Mbit/s{r === 100 ? " (default)" : ""}</Chip>
        ))}
      </div>
      <Panel>
        <svg viewBox="0 0 600 300" className="h-auto w-full" style={{ maxHeight: 340 }} role="img" aria-label="OSPF SPF tree จาก R1">
          {links.map((l, i) => {
            const A = NODES[l.a], B = NODES[l.b];
            const inTree = res.tree.has(i);
            const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
            return (
              <g key={i}>
                <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={inTree ? "var(--accent)" : "var(--border)"} strokeWidth={inTree ? 3.2 : 1.6} />
                <text x={mx} y={my - 5} fontSize={10} textAnchor="middle" fill={inTree ? "var(--accent)" : "var(--muted)"} style={{ paintOrder: "stroke", stroke: "var(--surface)", strokeWidth: 3 }}>
                  {BW_LABEL[l.bw]} · cost {cost(l.bw)}
                </text>
              </g>
            );
          })}
          {Object.entries(NODES).map(([id, p]) => (
            <g key={id} transform={`translate(${p.x},${p.y})`}>
              <ellipse rx={22} ry={15} fill={id === "R1" ? "var(--accent-soft)" : "var(--surface)"} stroke="var(--accent)" strokeWidth={1.8} />
              <text y={4} fontSize={11} fontWeight={700} textAnchor="middle" fill="var(--fg)">{id}</text>
              <text y={30} fontSize={10} textAnchor="middle" fill="var(--accent)">{id === "R1" ? "root ของ SPF" : `= ${res.dist.get(id)}`}</text>
            </g>
          ))}
        </svg>
        <p className="mt-2 text-xs text-muted">cost = bandwidth-reference ÷ bandwidth (ปัดลง ต่ำสุด 1) · เส้นสีเข้มคือ shortest path tree จาก R1 · คำสั่ง: <code>bandwidth-reference {ref}</code> ใน ospf view (ต้องตั้งเหมือนกันทุก router)</p>
      </Panel>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="ความเร็วลิงก์">
          <div className="space-y-2">
            {links.map((l, i) => (
              <label key={i} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-mono text-xs">{l.a} — {l.b}</span>
                <select value={l.bw} onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, bw: Number(e.target.value) as Bw } : x)))} className="rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs">
                  {([10, 100, 1000, 10000] as Bw[]).map((b) => <option key={b} value={b}>{BW_LABEL[b]}</option>)}
                </select>
              </label>
            ))}
          </div>
        </Panel>
        <Panel title="routing จาก R1">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted"><tr><th className="pb-1 font-medium">ปลายทาง</th><th className="pb-1 font-medium">cost</th><th className="pb-1 font-medium">เส้นทาง</th></tr></thead>
            <tbody>
              {Object.keys(NODES).filter((n) => n !== "R1").map((n) => {
                const ps = res.paths(n);
                return (
                  <tr key={n} className="border-t border-border align-top">
                    <td className="py-1.5 font-medium">{n}</td>
                    <td className="py-1.5 font-mono">{res.dist.get(n)}</td>
                    <td className="py-1.5 font-mono text-xs">{ps.map((p) => <div key={p}>{p}</div>)}{ps.length > 1 && <span className="text-accent">ECMP {ps.length} เส้น</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      </div>
      {ref === 100 && (
        <p className="rounded-lg bg-warning/10 p-3 text-sm">สังเกต: ค่า default 100 Mbit/s ทำให้ลิงก์ 100M, 1G และ 10G มี cost = 1 เท่ากันหมด OSPF จึงแยกความเร็วไม่ออก — ลองเปลี่ยนเป็น 10000</p>
      )}
    </div>
  );
}

export default function OspfLab() {
  return (
    <Tabs
      tabs={[
        { id: "fsm", label: "Neighbor states", content: <NeighborFsm /> },
        { id: "dr", label: "DR/BDR election", content: <DrElection /> },
        { id: "spf", label: "SPF cost", content: <SpfCost /> },
      ]}
    />
  );
}
