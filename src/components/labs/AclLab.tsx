"use client";

import { useMemo, useState } from "react";
import { toInt } from "@/lib/ipv4";
import { Chip, Panel } from "./ui";

type Proto = "ip" | "tcp" | "udp" | "icmp";
type Addr = { ip: number; wc: number; text: string } | null; // null = any
type Rule = {
  id: number;
  action: "permit" | "deny";
  proto: Proto;
  src: Addr;
  dst: Addr;
  sport?: number;
  dport?: number;
  line: string;
};
type Parsed = { rules: Rule[]; errors: string[] };

const PORTS: Record<string, number> = { www: 80, http: 80, https: 443, ftp: 21, "ftp-data": 20, ssh: 22, telnet: 23, smtp: 25, domain: 53, dns: 53, tftp: 69, snmp: 161, ntp: 123, bootps: 67, bootpc: 68, pop3: 110 };

function parsePort(s: string | undefined): number | undefined {
  if (s === undefined) return undefined;
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    return n <= 65535 ? n : NaN;
  }
  return PORTS[s.toLowerCase()] ?? NaN;
}

function parseAddr(tokens: string[], i: number): { addr: Addr; next: number } | string {
  const a = tokens[i];
  if (!a) return "ขาด address หลัง source/destination";
  if (a === "any") return { addr: null, next: i + 1 };
  const ip = toInt(a);
  if (ip === null) return `address ไม่ถูกต้อง: ${a}`;
  const w = tokens[i + 1];
  if (w === undefined) return `ขาด wildcard หลัง ${a}`;
  if (w === "0") return { addr: { ip, wc: 0, text: `${a} 0` }, next: i + 2 };
  const wc = toInt(w);
  if (wc === null) {
    if (/^\d+$/.test(w)) return `VRP ต้องใช้ wildcard ไม่ใช่ prefix length — "${a} ${w}" ไม่ใช่ /${w}`;
    return `wildcard ไม่ถูกต้อง: ${w}`;
  }
  return { addr: { ip, wc, text: `${a} ${w}` }, next: i + 2 };
}

function parseRules(text: string, basic: boolean): Parsed {
  const rules: Rule[] = [];
  const errors: string[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  for (const line of lines) {
    const t = line.split(/\s+/);
    let i = 0;
    const err = (m: string) => errors.push(`"${line}" → ${m}`);
    if (t[i] !== "rule") { err("ต้องขึ้นต้นด้วย rule"); continue; }
    i++;
    let id: number | undefined;
    if (/^\d+$/.test(t[i] ?? "")) { id = Number(t[i]); i++; }
    const action = t[i];
    if (action !== "permit" && action !== "deny") { err("ต้องระบุ permit หรือ deny"); continue; }
    i++;
    let proto: Proto = "ip";
    if (!basic) {
      const p = (t[i] ?? "").toLowerCase();
      if (p === "ip" || p === "tcp" || p === "udp" || p === "icmp") { proto = p; i++; }
      else { err("advanced ACL ต้องระบุ protocol (ip/tcp/udp/icmp)"); continue; }
    }
    let src: Addr = null, dst: Addr = null, sport: number | undefined, dport: number | undefined;
    let bad = false;
    while (i < t.length && !bad) {
      const k = t[i];
      if (k === "source" || k === "destination") {
        if (basic && k === "destination") { err("basic ACL (2000–2999) match ได้แค่ source"); bad = true; break; }
        const r = parseAddr(t, i + 1);
        if (typeof r === "string") { err(r); bad = true; break; }
        if (k === "source") src = r.addr; else dst = r.addr;
        i = r.next;
      } else if (k === "source-port" || k === "destination-port") {
        if (basic) { err("basic ACL ระบุ port ไม่ได้"); bad = true; break; }
        if (proto !== "tcp" && proto !== "udp") { err("ระบุ port ได้เฉพาะ tcp/udp"); bad = true; break; }
        if (t[i + 1] !== "eq") { err("lab นี้รองรับเฉพาะ eq"); bad = true; break; }
        const n = parsePort(t[i + 2]);
        if (n === undefined || Number.isNaN(n)) { err(`port ไม่ถูกต้อง: ${t[i + 2] ?? ""}`); bad = true; break; }
        if (k === "source-port") sport = n; else dport = n;
        i += 3;
      } else { err(`ไม่รู้จัก "${k}"`); bad = true; }
    }
    if (bad) continue;
    if (id === undefined) {
      // VRP: next multiple of step (5) above the highest existing rule ID
      const max = rules.reduce((m, r) => Math.max(m, r.id), -1);
      id = (Math.floor(max / 5) + 1) * 5;
    }
    if (rules.some((r) => r.id === id)) { err(`rule ${id} ซ้ำ (ใน VRP จะเป็นการแก้ rule เดิม)`); continue; }
    rules.push({ id, action, proto, src, dst, sport, dport, line });
  }
  rules.sort((a, b) => a.id - b.id);
  return { rules, errors };
}

const addrMatch = (a: Addr, ip: number) => a === null || ((a.ip & ~a.wc) >>> 0) === ((ip & ~a.wc) >>> 0);

type Pkt = { src: string; dst: string; proto: Proto; sport: string; dport: string };

function why(r: Rule, p: { src: number; dst: number; proto: Proto; sport: number; dport: number }): string | null {
  if (r.proto !== "ip" && r.proto !== p.proto) return `protocol ${p.proto} ≠ ${r.proto}`;
  if (!addrMatch(r.src, p.src)) return "source ไม่ตรง";
  if (!addrMatch(r.dst, p.dst)) return "destination ไม่ตรง";
  if (r.sport !== undefined && r.sport !== p.sport) return `source-port ≠ ${r.sport}`;
  if (r.dport !== undefined && r.dport !== p.dport) return `destination-port ≠ ${r.dport}`;
  return null;
}

type Ctx = "filter" | "vty" | "nat";
const CTX: Record<Ctx, { label: string; noMatch: string; permit: string; deny: string }> = {
  filter: { label: "traffic-filter (interface)", noMatch: "ไม่ match rule ใด → permit (ค่า default ของ traffic-filter บน AR/S)", permit: "ปล่อยผ่าน", deny: "ทิ้ง packet" },
  vty: { label: "user-interface vty (acl inbound)", noMatch: "ไม่ match rule ใด → deny (login ไม่ได้)", permit: "login ได้", deny: "login ไม่ได้" },
  nat: { label: "nat outbound", noMatch: "ไม่ match → ส่งออกไปโดยไม่แปลง address", permit: "แปลง address", deny: "ไม่แปลง (แต่ไม่ได้ทิ้ง packet)" },
};

const PRESETS: { name: string; acl: number; text: string; pkt: Pkt; ctx: Ctx }[] = [
  {
    name: "แผนก A ใช้ได้แค่ web",
    acl: 3000,
    ctx: "filter",
    text: "rule 5 permit tcp source 10.1.10.0 0.0.0.255 destination 10.1.100.10 0 destination-port eq 80\nrule 10 permit tcp source 10.1.10.0 0.0.0.255 destination 10.1.100.10 0 destination-port eq 443\nrule 15 deny ip source 10.1.10.0 0.0.0.255",
    pkt: { src: "10.1.10.25", dst: "10.1.100.20", proto: "tcp", sport: "50000", dport: "21" },
  },
  {
    name: "กับดัก: deny มาก่อน",
    acl: 3000,
    ctx: "filter",
    text: "rule 5 deny ip source 10.1.10.0 0.0.0.255\nrule 10 permit tcp source 10.1.10.0 0.0.0.255 destination-port eq 80",
    pkt: { src: "10.1.10.25", dst: "10.1.100.10", proto: "tcp", sport: "50000", dport: "80" },
  },
  {
    name: "basic ACL บน VTY",
    acl: 2001,
    ctx: "vty",
    text: "rule permit source 10.1.10.0 0.0.0.255",
    pkt: { src: "10.1.20.8", dst: "10.1.1.1", proto: "tcp", sport: "50000", dport: "23" },
  },
  {
    name: "wildcard เลขคู่",
    acl: 2000,
    ctx: "filter",
    text: "rule deny source 192.168.1.0 0.0.0.254",
    pkt: { src: "192.168.1.7", dst: "8.8.8.8", proto: "icmp", sport: "", dport: "" },
  },
];

export default function AclLab() {
  const [acl, setAcl] = useState(PRESETS[0].acl);
  const [text, setText] = useState(PRESETS[0].text);
  const [ctx, setCtx] = useState<Ctx>(PRESETS[0].ctx);
  const [pkt, setPkt] = useState<Pkt>(PRESETS[0].pkt);
  const basic = acl >= 2000 && acl <= 2999;
  const { rules, errors } = useMemo(() => parseRules(text, basic), [text, basic]);

  const p = {
    src: toInt(pkt.src),
    dst: toInt(pkt.dst),
    proto: pkt.proto,
    sport: Number(pkt.sport) || 0,
    dport: Number(pkt.dport) || 0,
  };
  const pk = p.src !== null && p.dst !== null ? { ...p, src: p.src, dst: p.dst } : null;
  const pktOk = pk !== null;
  const evals = pk ? rules.map((r) => ({ r, reason: why(r, pk) })) : [];
  const hitIdx = evals.findIndex((e) => e.reason === null);
  const hit = hitIdx >= 0 ? evals[hitIdx].r : null;
  const c = CTX[ctx];
  const ported = pkt.proto === "tcp" || pkt.proto === "udp";

  const load = (i: number) => {
    const pr = PRESETS[i];
    setAcl(pr.acl); setText(pr.text); setCtx(pr.ctx); setPkt(pr.pkt);
  };

  const input = "w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <span className="self-center text-sm text-muted">ตัวอย่าง:</span>
        {PRESETS.map((pr, i) => (
          <Chip key={pr.name} onClick={() => load(i)}>{pr.name}</Chip>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="1. เขียน ACL">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <label htmlFor="acl-no">acl number</label>
            <input id="acl-no" type="number" min={2000} max={3999} value={acl} onChange={(e) => setAcl(Number(e.target.value))} className="w-24 rounded-md border border-border bg-surface px-2 py-1 font-mono" />
            <span className="rounded bg-surface-2 px-2 py-0.5 text-xs">{basic ? "Basic — source เท่านั้น" : acl >= 3000 && acl <= 3999 ? "Advanced — 5-tuple" : "lab รองรับ 2000–3999"}</span>
          </div>
          <textarea aria-label="ACL rules" value={text} onChange={(e) => setText(e.target.value)} rows={7} spellCheck={false} className={input} />
          <p className="mt-2 text-xs text-muted">
            รูปแบบ: <code>rule [id] permit|deny {basic ? "" : "<ip|tcp|udp|icmp> "}source &lt;ip&gt; &lt;wildcard&gt;|any{basic ? "" : " destination … destination-port eq <port>"}</code> — ไม่ใส่ id จะได้ค่าอัตโนมัติตาม step 5
          </p>
          {errors.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-danger">
              {errors.map((e) => <li key={e}>⚠ {e}</li>)}
            </ul>
          )}
        </Panel>

        <Panel title="2. packet ที่จะทดสอบ">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="col-span-2 sm:col-span-1">Source IP<input value={pkt.src} onChange={(e) => setPkt({ ...pkt, src: e.target.value })} className={input} /></label>
            <label className="col-span-2 sm:col-span-1">Destination IP<input value={pkt.dst} onChange={(e) => setPkt({ ...pkt, dst: e.target.value })} className={input} /></label>
            <label>Protocol
              <select value={pkt.proto} onChange={(e) => setPkt({ ...pkt, proto: e.target.value as Proto })} className={input}>
                <option value="tcp">tcp</option><option value="udp">udp</option><option value="icmp">icmp</option>
              </select>
            </label>
            <label>Dst port<input value={pkt.dport} disabled={!ported} onChange={(e) => setPkt({ ...pkt, dport: e.target.value })} className={`${input} disabled:opacity-40`} /></label>
            <label className="col-span-2">Src port<input value={pkt.sport} disabled={!ported} onChange={(e) => setPkt({ ...pkt, sport: e.target.value })} className={`${input} disabled:opacity-40`} /></label>
          </div>
          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-medium">ACL ถูกเรียกใช้โดย</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CTX) as Ctx[]).map((k) => (
                <Chip key={k} active={ctx === k} onClick={() => setCtx(k)}>{CTX[k].label}</Chip>
              ))}
            </div>
          </fieldset>
          {!pktOk && <p className="mt-3 text-sm text-danger">IP ของ packet ไม่ถูกต้อง</p>}
        </Panel>
      </div>

      <Panel title="3. ผลการ match (ตรวจจาก rule ID น้อยไปมาก)">
        <ol className="space-y-2">
          {evals.map(({ r, reason }, i) => {
            const isHit = i === hitIdx;
            const skipped = hitIdx >= 0 && i > hitIdx;
            return (
              <li key={r.id} className={`rounded-lg border p-3 text-sm ${isHit ? (r.action === "permit" ? "border-success bg-success/10" : "border-danger bg-danger/10") : "border-border"} ${skipped ? "opacity-45" : ""}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <code className="break-all font-mono text-xs sm:text-sm">rule {r.id} {r.line.replace(/^rule\s+(\d+\s+)?/, "")}</code>
                  <span className={`shrink-0 text-xs font-semibold ${isHit ? "" : "text-muted"}`}>
                    {skipped ? "ไม่ถูกตรวจ (หยุดที่ rule แรกแล้ว)" : isHit ? `✓ MATCH → ${r.action}` : `✗ ${reason}`}
                  </span>
                </div>
              </li>
            );
          })}
          {rules.length === 0 && <li className="text-sm text-muted">ยังไม่มี rule</li>}
        </ol>
        {pktOk && (
          <div className={`mt-4 rounded-lg p-4 text-sm font-medium ${hit ? (hit.action === "permit" ? "bg-success/10 text-success" : "bg-danger/10 text-danger") : "bg-surface-2"}`}>
            {hit
              ? `ผลลัพธ์: rule ${hit.id} ${hit.action} → ${hit.action === "permit" ? c.permit : c.deny}`
              : rules.length === 0 && ctx === "vty"
                ? "ACL ไม่มี rule เลย → permit ทุก login"
                : `ผลลัพธ์: ${c.noMatch}`}
          </div>
        )}
      </Panel>
    </div>
  );
}
