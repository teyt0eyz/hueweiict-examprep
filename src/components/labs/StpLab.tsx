"use client";

import { useMemo, useState } from "react";
import { Chip, Panel } from "./ui";

type Speed = "100M" | "1G" | "10G";
type Sw = { id: string; x: number; y: number; pri: number; mac: string };
type Lk = { a: string; pa: number; b: string; pb: number; speed: Speed };
type Topo = { name: string; w: number; h: number; sws: Sw[]; links: Lk[] };
type Role = "R" | "D" | "A";
type Guess = Role | "?";

const COST: Record<Speed, number> = { "100M": 200000, "1G": 20000, "10G": 2000 }; // IEEE 802.1t (Huawei default)
const ROLE_NAME: Record<Role, string> = { R: "Root port", D: "Designated port", A: "Alternate (blocked)" };
const ROLE_CLASS: Record<Guess, string> = { R: "var(--accent)", D: "var(--success)", A: "var(--danger)", "?": "var(--muted)" };

const bid = (s: Sw) => `${s.pri.toString().padStart(5, "0")}.${s.mac}`;
const cmp = (a: (string | number)[], b: (string | number)[]) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return 0;
};
const endKey = (i: number, side: "a" | "b") => `${i}${side}`;

function solve(t: Topo) {
  const by = new Map(t.sws.map((s) => [s.id, s]));
  const root = [...t.sws].sort((x, y) => (bid(x) < bid(y) ? -1 : 1))[0];
  // root path cost (Bellman-Ford, tiny graphs)
  const rpc = new Map(t.sws.map((s) => [s.id, s.id === root.id ? 0 : Infinity]));
  for (let k = 0; k < t.sws.length; k++)
    for (const l of t.links) {
      const c = COST[l.speed];
      rpc.set(l.a, Math.min(rpc.get(l.a)!, rpc.get(l.b)! + c));
      rpc.set(l.b, Math.min(rpc.get(l.b)!, rpc.get(l.a)! + c));
    }
  const roles = new Map<string, Role>();
  const rootPort = new Map<string, string>();
  for (const s of t.sws) {
    if (s.id === root.id) continue;
    const cands: { key: string; v: (string | number)[] }[] = [];
    t.links.forEach((l, i) => {
      for (const side of ["a", "b"] as const) {
        if ((side === "a" ? l.a : l.b) !== s.id) continue;
        const peer = side === "a" ? l.b : l.a;
        cands.push({ key: endKey(i, side), v: [rpc.get(peer)! + COST[l.speed], bid(by.get(peer)!), side === "a" ? l.pb : l.pa, side === "a" ? l.pa : l.pb] });
      }
    });
    cands.sort((x, y) => cmp(x.v, y.v));
    if (cands[0]) rootPort.set(s.id, cands[0].key);
  }
  t.links.forEach((l, i) => {
    const ka = endKey(i, "a"), kb = endKey(i, "b");
    if (rootPort.get(l.a) === ka) roles.set(ka, "R");
    if (rootPort.get(l.b) === kb) roles.set(kb, "R");
    const va = [rpc.get(l.a)!, bid(by.get(l.a)!), l.pa];
    const vb = [rpc.get(l.b)!, bid(by.get(l.b)!), l.pb];
    const desig = cmp(va, vb) < 0 ? ka : kb;
    roles.set(desig, "D");
    for (const k of [ka, kb]) if (!roles.has(k)) roles.set(k, "A");
  });
  return { root: root.id, rpc, roles };
}

const MACS = ["4c1f-cc00-0001", "4c1f-cc00-0002", "4c1f-cc00-0003", "4c1f-cc00-0004"];
const sw = (id: string, x: number, y: number, pri = 32768, mac = MACS[Number(id.slice(2)) - 1]): Sw => ({ id, x, y, pri, mac });

const PRESETS: Topo[] = [
  {
    name: "สามเหลี่ยม (ค่า default)",
    w: 560, h: 300,
    sws: [sw("SW1", 280, 55), sw("SW2", 100, 240), sw("SW3", 460, 240)],
    links: [{ a: "SW1", pa: 1, b: "SW2", pb: 1, speed: "1G" }, { a: "SW1", pa: 2, b: "SW3", pb: 1, speed: "1G" }, { a: "SW2", pa: 2, b: "SW3", pb: 2, speed: "1G" }],
  },
  {
    name: "cost ชนะจำนวน hop",
    w: 560, h: 300,
    sws: [sw("SW1", 280, 55, 4096), sw("SW2", 100, 240), sw("SW3", 460, 240)],
    links: [{ a: "SW1", pa: 1, b: "SW2", pb: 1, speed: "10G" }, { a: "SW1", pa: 2, b: "SW3", pb: 1, speed: "100M" }, { a: "SW2", pa: 2, b: "SW3", pb: 2, speed: "10G" }],
  },
  {
    name: "สี่เหลี่ยม + ทแยง",
    w: 560, h: 320,
    sws: [sw("SW1", 110, 60, 32768, "4c1f-cc00-0009"), sw("SW2", 450, 60, 8192), sw("SW3", 110, 260), sw("SW4", 450, 260)],
    links: [
      { a: "SW1", pa: 1, b: "SW2", pb: 1, speed: "1G" }, { a: "SW2", pa: 2, b: "SW4", pb: 1, speed: "1G" },
      { a: "SW4", pa: 2, b: "SW3", pb: 2, speed: "1G" }, { a: "SW3", pa: 1, b: "SW1", pb: 2, speed: "1G" },
      { a: "SW2", pa: 3, b: "SW3", pb: 3, speed: "1G" },
    ],
  },
  {
    name: "ลิงก์ขนาน (ตัดสินด้วย port ID)",
    w: 560, h: 300,
    sws: [sw("SW1", 140, 150, 4096), sw("SW2", 420, 150)],
    links: [{ a: "SW1", pa: 1, b: "SW2", pb: 2, speed: "1G" }, { a: "SW1", pa: 2, b: "SW2", pb: 1, speed: "1G" }],
  },
];

function randomTopo(seed: number): Topo {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const base = PRESETS[pick([0, 2])];
  return {
    ...base,
    name: "สุ่ม",
    sws: base.sws.map((x) => ({ ...x, pri: pick([4096, 8192, 32768, 32768, 32768]), mac: `4c1f-${Math.floor(rnd() * 0xffff).toString(16).padStart(4, "0")}-${Math.floor(rnd() * 0xffff).toString(16).padStart(4, "0")}` })),
    links: base.links.map((l) => ({ ...l, speed: pick<Speed>(["100M", "1G", "1G", "10G"]) })),
  };
}

const STEP_TEXT = [
  "เริ่มจากทายบทบาทเอง: คลิกสวิตช์ที่คิดว่าเป็น root bridge และคลิกวงกลมที่พอร์ตเพื่อเลือก R / D / A",
  "ขั้น 1 — Root bridge: BID (priority + MAC) ต่ำสุด โดยเทียบ priority ก่อน",
  "ขั้น 2 — Root port: non-root bridge แต่ละตัวเลือกพอร์ตที่มี root path cost ต่ำสุด (เสมอกันดู sender BID → sender port ID → local port ID)",
  "ขั้น 3 — Designated port: ทุก segment มี designated port หนึ่งพอร์ต (ฝั่งที่ RPC ต่ำกว่า เสมอกันดู BID แล้ว port ID) — พอร์ตทุกพอร์ตของ root bridge เป็น designated",
  "ขั้น 4 — พอร์ตที่เหลือเป็น alternate port ถูก block (discarding) เพื่อตัด loop",
];

export default function StpLab() {
  const [topo, setTopo] = useState<Topo>(PRESETS[0]);
  const [presetIdx, setPresetIdx] = useState(0);
  const [guess, setGuess] = useState<Record<string, Guess>>({});
  const [rootGuess, setRootGuess] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState(false);
  const [seed, setSeed] = useState(7);
  const sol = useMemo(() => solve(topo), [topo]);

  const load = (t: Topo) => { setTopo(t); setGuess({}); setRootGuess(null); setStep(0); setChecked(false); };
  const cycle = (k: string) => {
    if (step > 0) return;
    const order: Guess[] = ["?", "R", "D", "A"];
    const cur = guess[k] ?? "?";
    setGuess({ ...guess, [k]: order[(order.indexOf(cur) + 1) % order.length] });
    setChecked(false);
  };
  const setPri = (id: string, pri: number) => load({ ...topo, sws: topo.sws.map((s) => (s.id === id ? { ...s, pri } : s)) });
  const setSpeed = (i: number, speed: Speed) => load({ ...topo, links: topo.links.map((l, j) => (j === i ? { ...l, speed } : l)) });

  const shown = (k: string): Guess => {
    const r = sol.roles.get(k)!;
    if (step >= 4 || (step >= 3 && r !== "A") || (step >= 2 && r === "R")) return r;
    return step > 0 ? "?" : guess[k] ?? "?";
  };

  const total = topo.links.length * 2 + 1;
  const correct = topo.links.reduce((n, _, i) => n + (["a", "b"] as const).filter((s) => guess[endKey(i, s)] === sol.roles.get(endKey(i, s))).length, 0) + (rootGuess === sol.root ? 1 : 0);
  const by = new Map(topo.sws.map((s) => [s.id, s]));

  // parallel link offsets
  const pairCount = new Map<string, number>();
  const offsets = topo.links.map((l) => {
    const key = [l.a, l.b].sort().join("-");
    const n = pairCount.get(key) ?? 0;
    pairCount.set(key, n + 1);
    const total = topo.links.filter((m) => [m.a, m.b].sort().join("-") === key).length;
    return (n - (total - 1) / 2) * 60;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p, i) => (
          <Chip key={p.name} active={presetIdx === i} onClick={() => { setPresetIdx(i); load(p); }}>{p.name}</Chip>
        ))}
        <Chip active={presetIdx === -1} onClick={() => { const n = seed + 1; setSeed(n); setPresetIdx(-1); load(randomTopo(n * 7919)); }}>🎲 สุ่มโจทย์</Chip>
      </div>

      <Panel>
        <svg viewBox={`0 0 ${topo.w} ${topo.h}`} className="h-auto w-full" style={{ maxHeight: 380 }} role="img" aria-label="STP topology">
          {topo.links.map((l, i) => {
            const A0 = by.get(l.a)!, B0 = by.get(l.b)!;
            const len = Math.hypot(B0.x - A0.x, B0.y - A0.y);
            const nx = -(B0.y - A0.y) / len, ny = (B0.x - A0.x) / len;
            const o = offsets[i];
            const A = { x: A0.x + nx * o, y: A0.y + ny * o }, B = { x: B0.x + nx * o, y: B0.y + ny * o };
            const at = (t: number) => ({ x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t });
            const blocked = step >= 4 && (sol.roles.get(endKey(i, "a")) === "A" || sol.roles.get(endKey(i, "b")) === "A");
            const mid = at(0.5);
            return (
              <g key={i}>
                <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={blocked ? "var(--danger)" : "var(--muted)"} strokeWidth={l.speed === "10G" ? 4 : l.speed === "1G" ? 2.4 : 1.4} strokeDasharray={blocked ? "6 5" : undefined} />
                <text x={mid.x} y={mid.y - 7} fontSize={10} textAnchor="middle" fill="var(--muted)" style={{ paintOrder: "stroke", stroke: "var(--surface)", strokeWidth: 3 }}>
                  {l.speed} · cost {COST[l.speed].toLocaleString()}
                </text>
                {(["a", "b"] as const).map((side) => {
                  const p = at(side === "a" ? 0.27 : 0.73);
                  const k = endKey(i, side);
                  const g = shown(k);
                  return (
                    <g key={side} transform={`translate(${p.x},${p.y})`} onClick={() => cycle(k)} style={{ cursor: step === 0 ? "pointer" : "default" }} role="button" aria-label={`พอร์ต G0/0/${side === "a" ? l.pa : l.pb} ของ ${side === "a" ? l.a : l.b}: ${g}`}>
                      <circle r={14} fill="transparent" />
                      <circle r={10} fill="var(--surface)" stroke={ROLE_CLASS[g]} strokeWidth={2} />
                      <text y={4} fontSize={11} fontWeight={700} textAnchor="middle" fill={ROLE_CLASS[g]}>{g}</text>
                      <text y={23} fontSize={9} textAnchor="middle" fill="var(--muted)">G0/0/{side === "a" ? l.pa : l.pb}</text>
                    </g>
                  );
                })}
              </g>
            );
          })}
          {topo.sws.map((s) => {
            const isRoot = step >= 1 && s.id === sol.root;
            const picked = step === 0 && rootGuess === s.id;
            return (
              <g key={s.id} transform={`translate(${s.x},${s.y})`} onClick={() => step === 0 && (setRootGuess(rootGuess === s.id ? null : s.id), setChecked(false))} style={{ cursor: step === 0 ? "pointer" : "default" }} role="button" aria-label={`${s.id} priority ${s.pri}`}>
                <rect x={-54} y={-20} width={108} height={40} rx={6} fill={isRoot || picked ? "var(--accent-soft)" : "var(--surface)"} stroke={isRoot ? "var(--accent)" : picked ? "var(--warning)" : "var(--border)"} strokeWidth={isRoot || picked ? 2.4 : 1.4} />
                <text y={-4} fontSize={12} fontWeight={700} textAnchor="middle" fill="var(--fg)">{s.id}{isRoot ? " ★ root" : ""}</text>
                <text y={11} fontSize={9} textAnchor="middle" fill="var(--muted)">{s.pri} · {s.mac}</text>
                {step >= 2 && <text y={33} fontSize={9} textAnchor="middle" fill="var(--accent)">RPC {sol.rpc.get(s.id)!.toLocaleString()}</text>}
              </g>
            );
          })}
        </svg>
        <p className="mt-2 text-sm">{STEP_TEXT[step]}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {step === 0 && (
            <button type="button" onClick={() => setChecked(true)} className="rounded-md border border-accent px-3 py-1.5 text-sm text-accent">ตรวจคำตอบ</button>
          )}
          {step < 4 && (
            <button type="button" onClick={() => setStep(step + 1)} className="rounded-md bg-accent px-3 py-1.5 text-sm text-accent-fg">{step === 0 ? "เฉลยทีละขั้น →" : "ขั้นถัดไป →"}</button>
          )}
          {step > 0 && (
            <button type="button" onClick={() => setStep(0)} className="rounded-md border border-border px-3 py-1.5 text-sm">กลับไปโหมดทาย</button>
          )}
        </div>
        {checked && step === 0 && (
          <p className={`mt-3 text-sm font-medium ${correct === total ? "text-success" : "text-warning"}`} aria-live="polite">
            ถูก {correct} / {total} (root bridge + {topo.links.length * 2} พอร์ต){correct === total ? " — เยี่ยม!" : " — ลองแก้แล้วตรวจอีกครั้ง หรือกดเฉลยทีละขั้น"}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
          {(["R", "D", "A"] as Role[]).map((r) => (
            <span key={r} className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: ROLE_CLASS[r] }} />{r} = {ROLE_NAME[r]}</span>
          ))}
        </div>
      </Panel>

      <Panel title="ปรับค่าแล้วดูผล">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Bridge priority (ผลคูณของ 4096)</p>
            {topo.sws.map((s) => (
              <label key={s.id} className="flex items-center justify-between gap-2 text-sm">
                <span>{s.id}</span>
                <select value={s.pri} onChange={(e) => setPri(s.id, Number(e.target.value))} className="rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs">
                  {Array.from({ length: 16 }, (_, i) => i * 4096).map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">ความเร็วลิงก์ (path cost แบบ dot1t)</p>
            {topo.links.map((l, i) => (
              <label key={i} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-mono text-xs">{l.a} G0/0/{l.pa} — {l.b} G0/0/{l.pb}</span>
                <select value={l.speed} onChange={(e) => setSpeed(i, e.target.value as Speed)} className="rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs">
                  {(Object.keys(COST) as Speed[]).map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">การเปลี่ยนค่าจะรีเซ็ตคำตอบที่ทายไว้ · ใน VRP ใช้ <code>stp priority 4096</code> หรือ <code>stp root primary</code> (= 0)</p>
      </Panel>
    </div>
  );
}
