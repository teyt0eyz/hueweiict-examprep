"use client";

import { useState } from "react";
import { Chip, Panel } from "./ui";

type PortType = "access" | "trunk" | "hybrid";
type Port = { type: PortType; pvid: number; allow: string; untagged: string };
type Frame = { tag: number | null }; // null = untagged

const parseList = (s: string): Set<number> => {
  const out = new Set<number>();
  for (const part of s.split(/[\s,]+/).filter(Boolean)) {
    const m = part.match(/^(\d+)(?:-(\d+)|\s*to\s*(\d+))?$/);
    if (!m) continue;
    const a = Number(m[1]);
    const b = Number(m[2] ?? m[3] ?? m[1]);
    for (let v = a; v <= Math.min(b, 4094); v++) out.add(v);
  }
  return out;
};

/** Ingress processing. Returns the VLAN the frame belongs to inside the switch, or a drop reason. */
function ingress(p: Port, f: Frame): { vlan: number; note: string } | { drop: string } {
  if (p.type === "access") {
    if (f.tag === null) return { vlan: p.pvid, note: `untagged → ใส่ tag PVID ${p.pvid}` };
    return f.tag === p.pvid ? { vlan: f.tag, note: `tag ${f.tag} = PVID → รับ` } : { drop: `access port รับ tagged frame ได้เฉพาะเมื่อ VID = PVID (${f.tag} ≠ ${p.pvid})` };
  }
  // trunk: allow-pass list · hybrid: tagged ∪ untagged lists
  const effective = p.type === "trunk" ? parseList(p.allow) : new Set([...parseList(p.allow), ...parseList(p.untagged)]);
  const vid = f.tag ?? p.pvid;
  const how = f.tag === null ? `untagged → ใส่ tag PVID ${p.pvid}` : `tag ${f.tag}`;
  return effective.has(vid) ? { vlan: vid, note: `${how} · VLAN ${vid} อยู่ในรายการที่อนุญาต → รับ` } : { drop: `${how} แต่ VLAN ${vid} ไม่อยู่ในรายการที่อนุญาตของพอร์ต → ทิ้ง` };
}

/** Egress processing. */
function egress(p: Port, vlan: number): { frame: Frame; note: string } | { drop: string } {
  if (p.type === "access") {
    return vlan === p.pvid ? { frame: { tag: null }, note: `VLAN ${vlan} = PVID → ถอด tag ส่งออก` } : { drop: `access port ส่งออกได้เฉพาะ VLAN = PVID (${vlan} ≠ ${p.pvid})` };
  }
  if (p.type === "trunk") {
    if (!parseList(p.allow).has(vlan)) return { drop: `VLAN ${vlan} ไม่อยู่ใน allow-pass ของ trunk → ทิ้ง` };
    return vlan === p.pvid ? { frame: { tag: null }, note: `VLAN ${vlan} = PVID → ถอด tag ส่งออก (untagged)` } : { frame: { tag: vlan }, note: `VLAN ${vlan} ≠ PVID → ส่งออกพร้อม tag ${vlan}` };
  }
  if (parseList(p.untagged).has(vlan)) return { frame: { tag: null }, note: `VLAN ${vlan} อยู่ใน untagged list → ถอด tag` };
  if (parseList(p.allow).has(vlan)) return { frame: { tag: vlan }, note: `VLAN ${vlan} อยู่ใน tagged list → คง tag` };
  return { drop: `VLAN ${vlan} ไม่อยู่ใน tagged/untagged list ของ hybrid port → ทิ้ง` };
}

type Cfg = { s1in: Port; s1out: Port; s2in: Port; s2out: Port };
const P = (type: PortType, pvid: number, allow = "", untagged = ""): Port => ({ type, pvid, allow, untagged });

const PRESETS: { name: string; desc: string; cfg: Cfg }[] = [
  { name: "access–trunk–access", desc: "กรณีปกติ: PC อยู่ VLAN 10 ทั้งสองฝั่ง", cfg: { s1in: P("access", 10), s1out: P("trunk", 1, "1 10 20"), s2in: P("trunk", 1, "1 10 20"), s2out: P("access", 10) } },
  { name: "trunk ไม่ allow", desc: "ลืม port trunk allow-pass vlan 10 บน SW2", cfg: { s1in: P("access", 10), s1out: P("trunk", 1, "1 10 20"), s2in: P("trunk", 1, "1 20"), s2out: P("access", 10) } },
  { name: "PVID ของ trunk ไม่ตรงกัน", desc: "SW1 trunk PVID 10 ส่ง VLAN 10 แบบ untagged แต่ SW2 PVID 1", cfg: { s1in: P("access", 10), s1out: P("trunk", 10, "1 10 20"), s2in: P("trunk", 1, "1 10 20"), s2out: P("access", 10) } },
  { name: "ปลายทางคนละ VLAN", desc: "PC-B อยู่ VLAN 20 — ต้องใช้ router/L3 switch", cfg: { s1in: P("access", 10), s1out: P("trunk", 1, "1 10 20"), s2in: P("trunk", 1, "1 10 20"), s2out: P("access", 20) } },
  { name: "hybrid", desc: "hybrid ทั้งเส้น: SW1 รับ untagged ด้วย PVID 10, tagged ระหว่างสวิตช์", cfg: { s1in: P("hybrid", 10, "", "10"), s1out: P("hybrid", 1, "10 20", ""), s2in: P("hybrid", 1, "10 20", ""), s2out: P("hybrid", 1, "", "10 20") } },
];

function cliOf(name: string, p: Port): string {
  const lines = [`[${name}]port link-type ${p.type}`];
  if (p.type === "access") lines.push(`[${name}]port default vlan ${p.pvid}`);
  if (p.type === "trunk") {
    lines.push(`[${name}]port trunk allow-pass vlan ${p.allow || "(ไม่มี)"}`);
    if (p.pvid !== 1) lines.push(`[${name}]port trunk pvid vlan ${p.pvid}`);
  }
  if (p.type === "hybrid") {
    if (p.allow) lines.push(`[${name}]port hybrid tagged vlan ${p.allow}`);
    if (p.untagged) lines.push(`[${name}]port hybrid untagged vlan ${p.untagged}`);
    lines.push(`[${name}]port hybrid pvid vlan ${p.pvid}`);
  }
  return lines.join("\n");
}

function PortEditor({ label, p, onChange }: { label: string; p: Port; onChange: (p: Port) => void }) {
  const inp = "w-full rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs";
  return (
    <fieldset className="rounded-lg border border-border p-3">
      <legend className="px-1 text-xs font-semibold">{label}</legend>
      <div className="flex gap-1">
        {(["access", "trunk", "hybrid"] as PortType[]).map((t) => (
          <button key={t} type="button" aria-pressed={p.type === t} onClick={() => onChange({ ...p, type: t })} className={`flex-1 rounded px-1 py-1 text-xs ${p.type === t ? "bg-accent text-accent-fg" : "bg-surface-2"}`}>{t}</button>
        ))}
      </div>
      <label className="mt-2 block text-xs text-muted">PVID
        <input type="number" min={1} max={4094} value={p.pvid} onChange={(e) => onChange({ ...p, pvid: Number(e.target.value) || 1 })} className={inp} />
      </label>
      {p.type !== "access" && (
        <label className="mt-2 block text-xs text-muted">{p.type === "trunk" ? "allow-pass vlan" : "tagged vlan"}
          <input value={p.allow} onChange={(e) => onChange({ ...p, allow: e.target.value })} className={inp} placeholder="เช่น 10 20 30-40" />
        </label>
      )}
      {p.type === "hybrid" && (
        <label className="mt-2 block text-xs text-muted">untagged vlan
          <input value={p.untagged} onChange={(e) => onChange({ ...p, untagged: e.target.value })} className={inp} />
        </label>
      )}
    </fieldset>
  );
}

type Step = { at: string; ok: boolean; text: string; frame?: Frame; vlan?: number };

function trace(c: Cfg): Step[] {
  const steps: Step[] = [{ at: "PC-A", ok: true, text: "ส่ง frame ปกติ (NIC ทั่วไปส่งแบบ untagged)", frame: { tag: null } }];
  let f: Frame = { tag: null };
  const hops: [string, Port, Port][] = [["SW1", c.s1in, c.s1out], ["SW2", c.s2in, c.s2out]];
  for (const [sw, pin, pout] of hops) {
    const i = ingress(pin, f);
    if ("drop" in i) { steps.push({ at: `${sw} ขาเข้า (${pin.type})`, ok: false, text: i.drop }); return steps; }
    steps.push({ at: `${sw} ขาเข้า (${pin.type})`, ok: true, text: i.note, vlan: i.vlan });
    const o = egress(pout, i.vlan);
    if ("drop" in o) { steps.push({ at: `${sw} ขาออก (${pout.type})`, ok: false, text: o.drop }); return steps; }
    f = o.frame;
    steps.push({ at: `${sw} ขาออก (${pout.type})`, ok: true, text: o.note, frame: f });
  }
  steps.push(f.tag === null
    ? { at: "PC-B", ok: true, text: "ได้รับ frame แบบ untagged ✓" }
    : { at: "PC-B", ok: false, text: `ได้รับ frame ที่มี tag ${f.tag} — PC ทั่วไปไม่เข้าใจ 802.1Q จึงทิ้ง` });
  return steps;
}

function Tag({ f }: { f?: Frame }) {
  if (!f) return null;
  return (
    <span className={`rounded px-1.5 py-0.5 font-mono text-[11px] ${f.tag === null ? "bg-surface-2" : "bg-accent-soft text-accent"}`}>{f.tag === null ? "untagged" : `802.1Q VID ${f.tag}`}</span>
  );
}

export default function VlanLab() {
  const [preset, setPreset] = useState(0);
  const [cfg, setCfg] = useState<Cfg>(PRESETS[0].cfg);
  const steps = trace(cfg);
  const delivered = steps[steps.length - 1].at === "PC-B" && steps[steps.length - 1].ok;
  const set = (k: keyof Cfg) => (p: Port) => setCfg({ ...cfg, [k]: p });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <span className="self-center text-sm text-muted">สถานการณ์:</span>
        {PRESETS.map((p, i) => (
          <Chip key={p.name} active={preset === i} onClick={() => { setPreset(i); setCfg(p.cfg); }}>{p.name}</Chip>
        ))}
      </div>
      <p className="text-sm text-muted">{PRESETS[preset].desc}</p>

      <Panel title="ตั้งค่าพอร์ตตามเส้นทาง PC-A → SW1 → SW2 → PC-B">
        <div className="mb-3 hidden items-center justify-between px-2 font-mono text-xs text-muted sm:flex">
          <span>PC-A</span><span>— G0/0/1 [SW1] G0/0/24 —</span><span>— G0/0/24 [SW2] G0/0/2 —</span><span>PC-B</span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <PortEditor label="SW1 G0/0/1 (จาก PC-A)" p={cfg.s1in} onChange={set("s1in")} />
          <PortEditor label="SW1 G0/0/24 (ไป SW2)" p={cfg.s1out} onChange={set("s1out")} />
          <PortEditor label="SW2 G0/0/24 (จาก SW1)" p={cfg.s2in} onChange={set("s2in")} />
          <PortEditor label="SW2 G0/0/2 (ไป PC-B)" p={cfg.s2out} onChange={set("s2out")} />
        </div>
      </Panel>

      <Panel title="เส้นทางของ frame">
        <ol className="relative space-y-3 border-l-2 border-border pl-5">
          {steps.map((s, i) => (
            <li key={i} className="relative">
              <span className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ${s.ok ? "bg-accent" : "bg-danger"}`} aria-hidden />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{s.at}</span>
                <Tag f={s.frame} />
                {s.vlan !== undefined && <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">ภายในสวิตช์: VLAN {s.vlan}</span>}
              </div>
              <p className={`text-sm ${s.ok ? "" : "text-danger"}`}>{s.ok ? "" : "✗ "}{s.text}</p>
            </li>
          ))}
        </ol>
        <p className={`mt-4 rounded-lg p-3 text-sm font-medium ${delivered ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
          {delivered ? "frame ถึง PC-B สำเร็จ" : "frame ไปไม่ถึง PC-B"}
        </p>
      </Panel>

      <Panel title="config ที่เทียบเท่า (VRP)">
        <div className="grid gap-3 md:grid-cols-2">
          {([["SW1-GigabitEthernet0/0/1", cfg.s1in], ["SW1-GigabitEthernet0/0/24", cfg.s1out], ["SW2-GigabitEthernet0/0/24", cfg.s2in], ["SW2-GigabitEthernet0/0/2", cfg.s2out]] as [string, Port][]).map(([n, p]) => (
            <pre key={n} className="overflow-x-auto rounded-lg bg-surface-2 p-3 font-mono text-xs leading-5">{cliOf(n, p)}</pre>
          ))}
        </div>
      </Panel>
    </div>
  );
}
