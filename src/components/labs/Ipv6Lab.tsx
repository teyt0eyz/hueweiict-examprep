"use client";

import { useState } from "react";
import { classifyV6, compressV6, eui64, expandV6, parseV6, solicitedNode } from "@/lib/ipv6";
import { Chip, Panel, Tabs } from "./ui";

const inp = "w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm";

function Row({ k, v, plain }: { k: string; v: string; plain?: boolean }) {
  return (
    <div className="bg-surface p-3">
      <dt className="text-xs text-muted">{k}</dt>
      <dd className={`break-all text-sm ${plain ? "" : "font-mono"}`}>{v}</dd>
    </div>
  );
}

// ------------------------------------------------------------ analyzer
const SAMPLES = ["2001:0db8:0000:0000:0008:0800:200c:417a", "fe80::2e0:fcff:fe12:3456", "ff02::1:ff28:9c5a", "fd12:3456:789a:1::1", "::1", "2001:db8:0:0:1:0:0:1"];

function Analyzer() {
  const [s, setS] = useState(SAMPLES[0]);
  const g = parseV6(s);
  const t = g ? classifyV6(g) : null;
  const isUnicast = t && !t.name.includes("ulticast") && t.name !== "Unspecified";
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium" htmlFor="v6-in">IPv6 address (รูปย่อหรือเต็มก็ได้)</label>
      <input id="v6-in" value={s} onChange={(e) => setS(e.target.value)} className={inp} spellCheck={false} autoComplete="off" />
      <div className="flex flex-wrap gap-2">
        {SAMPLES.map((x) => <Chip key={x} active={s === x} onClick={() => setS(x)}><span className="font-mono text-xs">{x}</span></Chip>)}
      </div>
      {!g ? (
        <p className="text-sm text-danger">รูปแบบไม่ถูกต้อง — ตรวจว่ามี 8 กลุ่ม, แต่ละกลุ่มไม่เกิน 4 หลักฐานสิบหก และใช้ <code>::</code> ไม่เกินหนึ่งครั้ง</p>
      ) : (
        <dl className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
          <Row k="รูปเต็ม (expanded)" v={expandV6(g)} />
          <Row k="รูปย่อมาตรฐาน (RFC 5952)" v={compressV6(g)} />
          <Row k="ชนิด" v={`${t!.name} · ${t!.prefix}`} />
          <Row k="หมายเหตุ" v={t!.note} plain />
          {isUnicast && <Row k="Solicited-node multicast" v={solicitedNode(g)} />}
          {isUnicast && <Row k="Interface ID (64 bit หลัง)" v={g.slice(4).map((n) => n.toString(16).padStart(4, "0")).join(":")} />}
        </dl>
      )}
      <p className="text-xs text-muted">กฎย่อ: ตัด 0 นำหน้าในแต่ละกลุ่ม · แทนกลุ่ม 0 ที่ต่อกันยาวที่สุด (≥ 2 กลุ่ม) ด้วย <code>::</code> ได้ครั้งเดียว · ถ้ายาวเท่ากันย่อช่วงแรก · ใช้ตัวพิมพ์เล็ก</p>
    </div>
  );
}

// ------------------------------------------------------------ EUI-64
function Eui64Tool() {
  const [mac, setMac] = useState("00e0-fc12-3456");
  const [prefix, setPrefix] = useState("2001:db8:1::");
  const r = eui64(mac);
  const p = parseV6(prefix);
  const gua = r && p ? compressV6([...p.slice(0, 4), ...r.groups]) : null;
  const lla = r ? compressV6([0xfe80, 0, 0, 0, ...r.groups]) : null;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">MAC address
          <input value={mac} onChange={(e) => setMac(e.target.value)} className={inp} spellCheck={false} placeholder="5489-98ab-cdef" />
        </label>
        <label className="text-sm font-medium">Prefix /64
          <input value={prefix} onChange={(e) => setPrefix(e.target.value)} className={inp} spellCheck={false} />
        </label>
      </div>
      {!r ? (
        <p className="text-sm text-danger">MAC ต้องมี 12 หลักฐานสิบหก (รูปแบบ xxxx-xxxx-xxxx, xx:xx:… ก็ได้)</p>
      ) : (
        <>
          <ol className="space-y-1 rounded-xl border border-border bg-surface p-4 font-mono text-xs leading-6">
            {r.steps.map((x, i) => <li key={i}><span className="text-muted">{i + 1}.</span> {x}</li>)}
          </ol>
          <dl className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
            <Row k="Link-local (FE80::/64 + EUI-64)" v={lla!} />
            <Row k="Global (prefix + EUI-64)" v={gua ?? "prefix ไม่ถูกต้อง"} />
          </dl>
          <p className="text-xs text-muted">VRP: <code>ipv6 address auto link-local</code> สร้าง link-local แบบนี้ · <code>ipv6 address 2001:db8:1:: 64 eui-64</code> ใช้ prefix + EUI-64</p>
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------ drill
let seedState = 1;
function rnd() {
  seedState = (seedState * 1103515245 + 12345) & 0x7fffffff;
  return seedState / 0x7fffffff;
}
function randomAddr(): number[] {
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const g = [pick([0x2001, 0x2400, 0x2001, 0xfe80, 0xfd00, 0x3ffe]), pick([0x0db8, 0x0, 0x0abc, 0x0100]), 0, 0, 0, 0, 0, 0];
  if (g[0] === 0xfe80) g[1] = 0;
  for (let i = 2; i < 8; i++) {
    const r = rnd();
    g[i] = r < 0.45 ? 0 : r < 0.65 ? Math.floor(rnd() * 0x10) : r < 0.8 ? Math.floor(rnd() * 0x1000) : Math.floor(rnd() * 0x10000);
  }
  return g;
}

function Drill() {
  const [mode, setMode] = useState<"compress" | "expand">("compress");
  const [addr, setAddr] = useState<number[]>(() => { seedState = 20261119; return randomAddr(); });
  const [ans, setAns] = useState("");
  const [res, setRes] = useState<null | { ok: boolean; msg: string }>(null);
  const [score, setScore] = useState({ ok: 0, total: 0 });

  const shown = mode === "compress" ? expandV6(addr) : compressV6(addr);
  const check = () => {
    const a = ans.trim().toLowerCase();
    const g = parseV6(a);
    let ok = false, msg = "";
    if (mode === "compress") {
      const canon = compressV6(addr);
      if (!g) msg = `รูปแบบไม่ถูกต้อง — คำตอบคือ ${canon}`;
      else if (expandV6(g) !== expandV6(addr)) msg = `ค่าไม่ตรงกับโจทย์ — คำตอบคือ ${canon}`;
      else if (a !== canon) msg = `ค่าถูกต้องแต่ยังไม่ใช่รูปย่อที่สั้นที่สุดตาม RFC 5952 — ${canon}`;
      else { ok = true; msg = "ถูกต้อง!"; }
    } else {
      const full = expandV6(addr);
      ok = a === full;
      msg = ok ? "ถูกต้อง!" : `คำตอบคือ ${full}`;
    }
    setRes({ ok, msg });
    setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), total: s.total + 1 }));
  };
  const next = () => { setAddr(randomAddr()); setAns(""); setRes(null); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={mode === "compress"} onClick={() => { setMode("compress"); next(); }}>ย่อ address</Chip>
        <Chip active={mode === "expand"} onClick={() => { setMode("expand"); next(); }}>ขยายเป็นรูปเต็ม</Chip>
        <span className="ml-auto text-sm text-muted">คะแนน {score.ok}/{score.total}</span>
      </div>
      <Panel>
        <p className="text-sm text-muted">{mode === "compress" ? "เขียนรูปย่อที่สั้นที่สุด (ตัวพิมพ์เล็ก)" : "เขียนรูปเต็ม 8 กลุ่ม กลุ่มละ 4 หลัก"}</p>
        <p className="my-3 break-all font-mono text-lg">{shown}</p>
        <form onSubmit={(e) => { e.preventDefault(); if (res) next(); else check(); }} className="flex flex-col gap-2 sm:flex-row">
          <input value={ans} onChange={(e) => setAns(e.target.value)} className={inp} spellCheck={false} autoComplete="off" aria-label="คำตอบ" readOnly={!!res} />
          <button type="submit" className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm text-accent-fg">{res ? "ข้อถัดไป" : "ตรวจ"}</button>
        </form>
        {res && <p className={`mt-3 break-all text-sm font-medium ${res.ok ? "text-success" : "text-danger"}`} aria-live="polite">{res.msg}</p>}
      </Panel>
    </div>
  );
}

export default function Ipv6Lab() {
  return (
    <Tabs
      tabs={[
        { id: "analyze", label: "วิเคราะห์ address", content: <Analyzer /> },
        { id: "eui", label: "EUI-64", content: <Eui64Tool /> },
        { id: "drill", label: "ฝึกย่อ/ขยาย", content: <Drill /> },
      ]}
    />
  );
}
