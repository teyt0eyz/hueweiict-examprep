"use client";

import { useEffect, useMemo, useState } from "react";
import { maskInt, parseCidr, prefixForHosts, subnet, toBinary, toInt, toIp } from "@/lib/ipv4";
import { readStore, writeStore } from "@/lib/storage";
import { Tabs } from "./ui";

// ---------------------------------------------------------------- calculator
function Calculator() {
  const [input, setInput] = useState("172.16.45.130/26");
  const parsed = parseCidr(input);
  const info = parsed ? subnet(parsed.ip, parsed.prefix) : null;
  const rows: [string, string][] = info
    ? [
        ["Network address", info.network],
        ["Broadcast address", info.broadcast],
        ["Host แรก – host สุดท้าย", `${info.first} – ${info.last}`],
        ["จำนวน host ที่ใช้ได้", info.hosts.toLocaleString()],
        ["Subnet mask", `${info.mask} (/${info.prefix})`],
        ["Wildcard mask", info.wildcard],
        ["Block size (address ทั้งหมด)", info.block.toLocaleString()],
        ["Class / ประเภท", `${info.cls} · ${info.scope}`],
      ]
    : [];
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium" htmlFor="calc-in">
        IP address พร้อม prefix หรือ mask
      </label>
      <input
        id="calc-in"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="เช่น 10.20.77.200/21 หรือ 192.168.1.10 255.255.255.0"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono"
        spellCheck={false}
        autoComplete="off"
      />
      {!info ? (
        <p className="text-sm text-danger">รูปแบบไม่ถูกต้อง — ใช้ a.b.c.d/nn หรือ a.b.c.d ตามด้วย mask</p>
      ) : (
        <>
          <dl className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div key={k} className="bg-surface p-3">
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="font-mono text-sm">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface p-3 font-mono text-xs leading-6">
            <p>
              <span className="inline-block w-20 text-muted">IP</span>
              <BinaryLine n={parsed!.ip} prefix={info.prefix} />
            </p>
            <p>
              <span className="inline-block w-20 text-muted">Mask</span>
              <BinaryLine n={maskInt(info.prefix)} prefix={info.prefix} />
            </p>
            <p>
              <span className="inline-block w-20 text-muted">Network</span>
              <BinaryLine n={toInt(info.network)!} prefix={info.prefix} />
            </p>
            <p className="mt-1 text-muted">
              <span className="text-accent">สีเขียว</span> = network bits · สีปกติ = host bits
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function BinaryLine({ n, prefix }: { n: number; prefix: number }) {
  const bits = toBinary(n);
  let count = 0;
  return (
    <span>
      {bits.split("").map((c, i) => {
        if (c === ".") return <span key={i}>.</span>;
        const isNet = count++ < prefix;
        return (
          <span key={i} className={isNet ? "text-accent" : ""}>
            {c}
          </span>
        );
      })}
    </span>
  );
}

// ---------------------------------------------------------------- drill
type Basic = { kind: "basic"; ip: number; prefix: number };
type Vlsm = { kind: "vlsm"; base: number; reqs: { name: string; hosts: number }[] };
type Problem = Basic | Vlsm;

/** event-handler clock (kept out of render) */
const clock = () => Date.now();

const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

function genBasic(): Basic {
  const prefix = [rnd(17, 30), rnd(20, 29), rnd(24, 30), rnd(9, 30)][rnd(0, 3)];
  const first = [10, 172, 192, rnd(1, 223)][rnd(0, 3)];
  const o1 = first === 127 ? 126 : first;
  const o2 = o1 === 172 ? rnd(16, 31) : o1 === 192 ? 168 : rnd(0, 255);
  const ip = toInt(`${o1}.${o2}.${rnd(0, 255)}.${rnd(1, 254)}`)!;
  return { kind: "basic", ip, prefix };
}

function genVlsm(): Vlsm {
  for (;;) {
    const k = rnd(3, 4);
    const hosts = [rnd(40, 120), ...Array.from({ length: k - 1 }, () => rnd(3, 60))].sort((a, b) => b - a);
    const total = hosts.reduce((s, h) => s + 2 ** (32 - prefixForHosts(h)), 0);
    if (total <= 256) {
      const base = toInt(rnd(0, 1) ? `192.168.${rnd(0, 255)}.0` : `10.${rnd(0, 255)}.${rnd(0, 255)}.0`)!;
      return { kind: "vlsm", base, reqs: hosts.map((h, i) => ({ name: `LAN ${String.fromCharCode(65 + i)}`, hosts: h })) };
    }
  }
}

function vlsmAnswer(p: Vlsm) {
  let cur = p.base;
  return p.reqs.map((r) => {
    const prefix = prefixForHosts(r.hosts);
    const net = cur;
    cur = (cur + 2 ** (32 - prefix)) >>> 0;
    return { ...r, prefix, network: toIp(net) };
  });
}

const norm = (s: string) => s.trim().replace(/^\//, "");

function Drill() {
  const [mode, setMode] = useState<"basic" | "vlsm">("basic");
  const [prob, setProb] = useState<Problem | null>(null);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [start, setStart] = useState(0);
  const [now, setNow] = useState(0);
  const [stats, setStats] = useState({ done: 0, correct: 0, streak: 0 });
  const [best, setBest] = useState<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(clock()), 250);
    return () => clearInterval(t);
  }, []);

  function next(m = mode) {
    setProb(m === "basic" ? genBasic() : genVlsm());
    setVals({});
    setChecked(false);
    setStart(clock());
    setBest(readStore<number | null>(`lab:subnet:best:${m}`, null));
  }

  const expected = useMemo<Record<string, string>>(() => {
    if (!prob) return {};
    if (prob.kind === "basic") {
      const s = subnet(prob.ip, prob.prefix);
      return { network: s.network, broadcast: s.broadcast, first: s.first, last: s.last, mask: s.mask };
    }
    const out: Record<string, string> = {};
    vlsmAnswer(prob).forEach((a, i) => {
      out[`net${i}`] = a.network;
      out[`pre${i}`] = String(a.prefix);
    });
    return out;
  }, [prob]);

  const results = Object.fromEntries(Object.entries(expected).map(([k, v]) => [k, norm(vals[k] ?? "") === v]));
  const allOk = Object.values(results).every(Boolean);
  const elapsed = checked ? 0 : prob ? Math.max(0, Math.round((now - start) / 1000)) : 0;

  function check() {
    if (!prob || checked) return;
    const secs = Math.round((clock() - start) / 1000);
    setChecked(true);
    setStats((s) => ({ done: s.done + 1, correct: s.correct + (allOk ? 1 : 0), streak: allOk ? s.streak + 1 : 0 }));
    if (allOk && (best === null || secs < best)) {
      writeStore(`lab:subnet:best:${mode}`, secs);
      setBest(secs);
    }
  }

  const field = (key: string, label: string, placeholder: string, mono = true) => (
    <label key={key} className="block">
      <span className="text-xs text-muted">{label}</span>
      <input
        value={vals[key] ?? ""}
        onChange={(e) => setVals((v) => ({ ...v, [key]: e.target.value }))}
        onKeyDown={(e) => e.key === "Enter" && (checked ? next() : check())}
        disabled={checked}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        inputMode="decimal"
        className={`mt-1 w-full rounded-lg border bg-surface px-3 py-2 ${mono ? "font-mono" : ""} ${checked ? (results[key] ? "border-success" : "border-danger") : "border-border"}`}
      />
      {checked && !results[key] && <span className="mt-1 block font-mono text-xs text-success">เฉลย: {expected[key]}</span>}
    </label>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["basic", "vlsm"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => {
              setMode(m);
              next(m);
            }}
            className={`rounded-md border px-3 py-1.5 text-sm ${mode === m ? "border-accent bg-accent-soft text-accent" : "border-border"}`}
          >
            {m === "basic" ? "หา network / broadcast / host" : "VLSM"}
          </button>
        ))}
        <span className="ml-auto text-sm tabular-nums text-muted">
          ถูก {stats.correct}/{stats.done} · ต่อเนื่อง {stats.streak} {best !== null && `· เร็วสุด ${best}s`}
        </span>
      </div>

      {!prob ? (
        <button type="button" onClick={() => next()} className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-accent-fg">
          เริ่มโจทย์แรก
        </button>
      ) : (
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            {prob.kind === "basic" ? (
              <p>
                host มี IP <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono">{toIp(prob.ip)}/{prob.prefix}</code> จงหาค่าต่อไปนี้
              </p>
            ) : (
              <div>
                <p>
                  ออกแบบ VLSM จาก <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono">{toIp(prob.base)}/24</code> — จัดสรรจากใหญ่ไปเล็ก ต่อกันจากต้น block
                </p>
                <ul className="mt-1 text-sm text-muted">
                  {prob.reqs.map((r) => (
                    <li key={r.name}>
                      {r.name}: ต้องการ {r.hosts} host
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <span className="w-16 shrink-0 rounded-md border border-border py-1 text-center font-mono tabular-nums" aria-label="เวลา">
              {checked ? "✓" : `${elapsed}s`}
            </span>
          </div>

          {prob.kind === "basic" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {field("network", "Network address", "x.x.x.x")}
              {field("broadcast", "Broadcast address", "x.x.x.x")}
              {field("first", "Host แรก", "x.x.x.x")}
              {field("last", "Host สุดท้าย", "x.x.x.x")}
              {field("mask", "Subnet mask (dotted)", "255.x.x.x")}
            </div>
          ) : (
            <div className="space-y-3">
              {prob.reqs.map((r, i) => (
                <div key={r.name} className="grid grid-cols-[4.5rem_1fr_5rem] items-end gap-2">
                  <span className="pb-2 text-sm font-medium">{r.name}</span>
                  {field(`net${i}`, "Network", "x.x.x.x")}
                  {field(`pre${i}`, "Prefix", "/nn")}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {!checked ? (
              <button type="button" onClick={check} className="rounded-lg bg-accent px-4 py-2 font-semibold text-accent-fg">
                ตรวจคำตอบ (Enter)
              </button>
            ) : (
              <>
                <p className={`font-semibold ${allOk ? "text-success" : "text-danger"}`}>{allOk ? "✓ ถูกทั้งหมด" : "✗ ยังไม่ถูกทั้งหมด — ดูเฉลยใต้ช่องที่ผิด"}</p>
                <button type="button" onClick={() => next()} className="ml-auto rounded-lg bg-accent px-4 py-2 font-semibold text-accent-fg">
                  โจทย์ถัดไป (Enter)
                </button>
              </>
            )}
          </div>
          {checked && prob.kind === "basic" && (
            <p className="mt-3 text-sm text-muted">
              วิธีคิด: /{prob.prefix} → block size ใน octet ที่น่าสนใจ = {(() => {
                const s = subnet(prob.ip, prob.prefix);
                const octet = Math.min(3, Math.floor(prob.prefix / 8));
                const m = Number(s.mask.split(".")[octet]);
                return `256 − ${m} = ${256 - m} (octet ที่ ${octet + 1})`;
              })()} แล้วหาตัวคูณของ block size ที่ไม่เกินค่า IP
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function SubnetLab() {
  return (
    <Tabs
      tabs={[
        { id: "drill", label: "Subnetting Drill", content: <Drill /> },
        { id: "calc", label: "Calculator", content: <Calculator /> },
      ]}
    />
  );
}
