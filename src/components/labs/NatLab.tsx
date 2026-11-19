"use client";

import { useState } from "react";
import { Chip, Panel } from "./ui";

type Mode = "static" | "dynamic" | "napt" | "easyip" | "server";
type Row = { proto: string; inside: string; global: string; outside: string; note?: string };
type Log = { ok: boolean; text: string };

const HOSTS = ["192.168.1.10", "192.168.1.11", "192.168.1.12", "192.168.1.13", "192.168.1.14"];
const POOL = ["202.1.1.11", "202.1.1.12", "202.1.1.13"];
const IFACE = "202.1.1.1";
const DEST = "8.8.8.8:443";
const STATIC_MAP: Record<string, string> = { "192.168.1.10": "202.1.1.10", "192.168.1.11": "202.1.1.20" };
const SERVER = { global: "202.1.1.5", gport: 80, inside: "192.168.1.100", iport: 8080 };

const MODES: Record<Mode, { label: string; summary: string; config: string }> = {
  static: {
    label: "Static NAT",
    summary: "1 private ↔ 1 public คงที่ ใช้ได้ทั้งขาออกและขาเข้า host ที่ไม่มี mapping จะไม่ถูกแปลง",
    config: "[R1-GigabitEthernet0/0/1]nat static global 202.1.1.10 inside 192.168.1.10\n[R1-GigabitEthernet0/0/1]nat static global 202.1.1.20 inside 192.168.1.11",
  },
  dynamic: {
    label: "Dynamic NAT (no-pat)",
    summary: "ยืม public IP ว่างใน pool ให้ host ละ 1 IP (ไม่แปลง port) — pool มี 3 IP จึงออกพร้อมกันได้ 3 host",
    config: "[R1]acl 2000\n[R1-acl-basic-2000]rule permit source 192.168.1.0 0.0.0.255\n[R1]nat address-group 1 202.1.1.11 202.1.1.13\n[R1-GigabitEthernet0/0/1]nat outbound 2000 address-group 1 no-pat",
  },
  napt: {
    label: "NAPT",
    summary: "หลาย host ใช้ IP ใน pool ร่วมกัน แยก session ด้วย port",
    config: "[R1]acl 2000\n[R1-acl-basic-2000]rule permit source 192.168.1.0 0.0.0.255\n[R1]nat address-group 1 202.1.1.11 202.1.1.13\n[R1-GigabitEthernet0/0/1]nat outbound 2000 address-group 1",
  },
  easyip: {
    label: "Easy IP",
    summary: "NAPT ที่ใช้ IP ของ interface ขาออก (202.1.1.1) ไม่ต้องมี address-group",
    config: "[R1]acl 2000\n[R1-acl-basic-2000]rule permit source 192.168.1.0 0.0.0.255\n[R1-GigabitEthernet0/0/1]nat outbound 2000",
  },
  server: {
    label: "NAT Server",
    summary: "ผู้ใช้ภายนอกเข้า 202.1.1.5:80 แล้วถูกส่งต่อไปยัง web server ภายใน 192.168.1.100:8080",
    config: "[R1-GigabitEthernet0/0/1]nat server protocol tcp global 202.1.1.5 www inside 192.168.1.100 8080",
  },
};

export default function NatLab() {
  const [mode, setMode] = useState<Mode>("napt");
  const [rows, setRows] = useState<Row[]>([]);
  const [log, setLog] = useState<Log[]>([]);
  const [nextPort, setNextPort] = useState(10240);
  const [srcPort, setSrcPort] = useState(50001);

  const reset = (m: Mode = mode) => {
    setMode(m); setRows([]); setLog([]); setNextPort(10240); setSrcPort(50001);
  };
  const push = (l: Log, r?: Row) => {
    setLog((x) => [l, ...x].slice(0, 12));
    if (r) setRows((x) => [...x, r]);
  };

  const outbound = (host: string) => {
    const sp = srcPort;
    setSrcPort(sp + 1);
    const inside = `${host}:${sp}`;
    if (mode === "server") {
      push({ ok: false, text: `${inside} → ${DEST}: NAT Server แปลงเฉพาะ traffic ที่เข้ามาหา server — host นี้ไม่ถูกแปลง (ISP จะทิ้ง packet ที่มี source เป็น private)` });
      return;
    }
    if (mode === "static") {
      const g = STATIC_MAP[host];
      if (!g) { push({ ok: false, text: `${host} ไม่มี static mapping → ออกไปด้วย private IP และไม่ได้รับคำตอบ` }); return; }
      push({ ok: true, text: `${inside} → ${g}:${sp} (แปลงเฉพาะ IP)` }, { proto: "TCP", inside, global: `${g}:${sp}`, outside: DEST, note: "static" });
      return;
    }
    if (mode === "dynamic") {
      const used = new Map(rows.map((r) => [r.inside.split(":")[0], r.global.split(":")[0]]));
      const g = used.get(host) ?? POOL.find((ip) => ![...used.values()].includes(ip));
      if (!g) { push({ ok: false, text: `${host}: pool เต็ม (ทั้ง ${POOL.length} IP ถูก host อื่นใช้อยู่) — ต้องรอให้ session หมดอายุ` }); return; }
      push({ ok: true, text: `${inside} → ${g}:${sp} (port เดิม เพราะ no-pat)` }, { proto: "TCP", inside, global: `${g}:${sp}`, outside: DEST });
      return;
    }
    const g = mode === "easyip" ? IFACE : POOL[0];
    const np = nextPort;
    setNextPort(np + 1);
    push({ ok: true, text: `${inside} → ${g}:${np} (แปลงทั้ง IP และ port)` }, { proto: "TCP", inside, global: `${g}:${np}`, outside: DEST });
  };

  const inbound = (port: number) => {
    const from = `8.8.4.4:${srcPort}`;
    setSrcPort(srcPort + 1);
    if (mode === "server") {
      if (port !== SERVER.gport) { push({ ok: false, text: `${from} → ${SERVER.global}:${port}: ไม่มี NAT Server สำหรับ port นี้ → ทิ้ง` }); return; }
      push({ ok: true, text: `${from} → ${SERVER.global}:${port} ถูกแปลง destination เป็น ${SERVER.inside}:${SERVER.iport}` }, { proto: "TCP", inside: `${SERVER.inside}:${SERVER.iport}`, global: `${SERVER.global}:${port}`, outside: from, note: "server" });
      return;
    }
    if (mode === "static") {
      push({ ok: true, text: `${from} → 202.1.1.10:${port} ถูกแปลง destination เป็น 192.168.1.10:${port} (static NAT รับขาเข้าได้ทุก port)` }, { proto: "TCP", inside: `192.168.1.10:${port}`, global: `202.1.1.10:${port}`, outside: from, note: "inbound" });
      return;
    }
    push({ ok: false, text: `${from} เริ่มเชื่อมต่อเข้ามาที่ public IP:${port} — ${MODES[mode].label} ไม่มี entry รองรับการเชื่อมต่อที่เริ่มจากภายนอก → ทิ้ง` });
  };

  const m = MODES[mode];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="ชนิด NAT">
        {(Object.keys(MODES) as Mode[]).map((k) => (
          <Chip key={k} active={mode === k} onClick={() => reset(k)}>{MODES[k].label}</Chip>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr] [&>*]:min-w-0">
        <Panel title={m.label}>
          <p className="text-sm">{m.summary}</p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-2 p-3 font-mono text-xs leading-5">{m.config}</pre>
          <p className="mt-3 text-xs text-muted">R1 G0/0/1 = {IFACE}/24 (ฝั่ง ISP) · LAN = 192.168.1.0/24</p>
        </Panel>

        <Panel title="ส่ง traffic">
          <p className="mb-2 text-sm font-medium">ขาออก: host ภายใน → {DEST}</p>
          <div className="flex flex-wrap gap-2">
            {HOSTS.map((h) => (
              <button key={h} type="button" onClick={() => outbound(h)} className="rounded-md border border-border px-3 py-1.5 font-mono text-xs hover:bg-surface-2">
                {h}
              </button>
            ))}
          </div>
          <p className="mb-2 mt-4 text-sm font-medium">ขาเข้า: ผู้ใช้อินเทอร์เน็ต 8.8.4.4 เริ่มเชื่อมต่อ</p>
          <div className="flex flex-wrap gap-2">
            {[80, 22].map((p) => (
              <button key={p} type="button" onClick={() => inbound(p)} className="rounded-md border border-border px-3 py-1.5 font-mono text-xs hover:bg-surface-2">
                → {mode === "server" ? SERVER.global : mode === "static" ? "202.1.1.10" : mode === "easyip" ? IFACE : POOL[0]}:{p}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => reset()} className="mt-4 text-sm text-muted underline">ล้างตาราง</button>
        </Panel>
      </div>

      <Panel title="NAT session table">
        <div className="table-wrap overflow-x-auto">
          <table className="w-full min-w-[520px] text-left font-mono text-xs">
            <thead className="text-muted">
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-medium">Proto</th>
                <th className="py-2 pr-3 font-medium">Inside (private)</th>
                <th className="py-2 pr-3 font-medium">Global (public)</th>
                <th className="py-2 pr-3 font-medium">Outside</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="py-1.5 pr-3">{r.proto}</td>
                  <td className="py-1.5 pr-3">{r.inside}</td>
                  <td className="py-1.5 pr-3 text-accent">{r.global}</td>
                  <td className="py-1.5 pr-3">{r.outside}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={4} className="py-3 text-muted">ยังไม่มี session — กดปุ่มส่ง traffic ด้านบน</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {log.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm" aria-live="polite">
            {log.map((l, i) => (
              <li key={i} className={l.ok ? "text-success" : "text-danger"}>{l.ok ? "✓" : "✗"} {l.text}</li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
