/** IPv6 helpers: parse, expand, compress (RFC 5952), classify, EUI-64. Groups are 8 numbers 0–0xffff. */

export function parseV6(input: string): number[] | null {
  let s = input.trim().toLowerCase();
  const slash = s.indexOf("/");
  if (slash >= 0) s = s.slice(0, slash);
  if (!s || !/^[0-9a-f:.]+$/.test(s)) return null;
  // embedded IPv4 tail (e.g. ::ffff:192.0.2.1)
  const v4 = s.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const o = v4.slice(1).map(Number);
    if (o.some((n) => n > 255)) return null;
    s = s.slice(0, v4.index) + `${((o[0] << 8) | o[1]).toString(16)}:${((o[2] << 8) | o[3]).toString(16)}`;
  }
  const dbl = s.split("::");
  if (dbl.length > 2) return null;
  const part = (x: string) => (x === "" ? [] : x.split(":"));
  const head = part(dbl[0]);
  const tail = dbl.length === 2 ? part(dbl[1]) : [];
  const groups = [...head, ...tail];
  if (groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  if (dbl.length === 1 && groups.length !== 8) return null;
  if (dbl.length === 2 && groups.length > 7) return null;
  const fill = dbl.length === 2 ? Array(8 - groups.length).fill("0") : [];
  return [...head, ...fill, ...tail].map((g) => parseInt(g, 16));
}

export const expandV6 = (g: number[]) => g.map((n) => n.toString(16).padStart(4, "0")).join(":");

export function compressV6(g: number[]): string {
  // longest run of ≥2 zero groups; first one wins on tie (RFC 5952)
  let best = -1, bestLen = 0;
  for (let i = 0; i < 8; ) {
    if (g[i] !== 0) { i++; continue; }
    let j = i;
    while (j < 8 && g[j] === 0) j++;
    if (j - i > bestLen) { best = i; bestLen = j - i; }
    i = j;
  }
  const hex = g.map((n) => n.toString(16));
  if (bestLen < 2) return hex.join(":");
  return `${hex.slice(0, best).join(":")}::${hex.slice(best + bestLen).join(":")}`;
}

export type V6Type = { name: string; prefix: string; note: string };

export function classifyV6(g: number[]): V6Type {
  const all0 = g.every((n) => n === 0);
  if (all0) return { name: "Unspecified", prefix: "::/128", note: "ยังไม่มี address เช่น source ระหว่างทำ DAD" };
  if (g.slice(0, 7).every((n) => n === 0) && g[7] === 1) return { name: "Loopback", prefix: "::1/128", note: "เทียบ 127.0.0.1" };
  if (g[0] >> 8 === 0xff) {
    const scope = g[0] & 0xf;
    const scopes: Record<number, string> = { 1: "interface-local", 2: "link-local", 5: "site-local", 8: "organization-local", 14: "global" };
    if (g[0] === 0xff02 && g.slice(1, 5).every((n) => n === 0) && g[5] === 1 && g[6] >> 8 === 0xff)
      return { name: "Solicited-node multicast", prefix: "FF02::1:FF00:0/104", note: "ใช้ใน NS (แทน ARP) และ DAD" };
    const known: Record<string, string> = { "ff02::1": "all nodes", "ff02::2": "all routers", "ff02::5": "OSPFv3 all SPF routers", "ff02::6": "OSPFv3 DR/BDR", "ff02::1:2": "all DHCPv6 relay agents/servers" };
    const k = compressV6(g);
    return { name: "Multicast", prefix: "FF00::/8", note: `scope: ${scopes[scope] ?? scope}${known[k] ? ` · ${known[k]}` : ""}` };
  }
  if ((g[0] & 0xffc0) === 0xfe80) return { name: "Link-local unicast", prefix: "FE80::/10", note: "ใช้ภายใน link เดียว · มีทุก interface ที่เปิด IPv6" };
  if ((g[0] & 0xfe00) === 0xfc00) return { name: "Unique local (ULA)", prefix: "FC00::/7", note: "เทียบ private IPv4 (ใช้จริงขึ้นต้น FD)" };
  if (g.slice(0, 5).every((n) => n === 0) && g[5] === 0xffff) return { name: "IPv4-mapped", prefix: "::FFFF:0:0/96", note: "แทน IPv4 ในโปรแกรมแบบ dual-stack" };
  if (g[0] === 0x2001 && g[1] === 0x0db8) return { name: "Global unicast (documentation)", prefix: "2001:DB8::/32", note: "สงวนไว้สำหรับตัวอย่างในเอกสาร" };
  if ((g[0] & 0xe000) === 0x2000) return { name: "Global unicast (GUA)", prefix: "2000::/3", note: "เทียบ public IPv4 · route บนอินเทอร์เน็ตได้" };
  return { name: "Reserved / อื่น ๆ", prefix: "—", note: "ไม่อยู่ในช่วงที่ใช้งานทั่วไป" };
}

export function solicitedNode(g: number[]): string {
  return compressV6([0xff02, 0, 0, 0, 0, 1, 0xff00 | (g[6] & 0xff), g[7]]);
}

/** EUI-64 interface ID from a MAC in any common format. Returns 4 groups or null. */
export function eui64(mac: string): { groups: number[]; steps: string[] } | null {
  const hex = mac.toLowerCase().replace(/[^0-9a-f]/g, "");
  if (hex.length !== 12) return null;
  const b = hex.match(/../g)!.map((x) => parseInt(x, 16));
  const flipped = b[0] ^ 0x02;
  const bytes = [flipped, b[1], b[2], 0xff, 0xfe, b[3], b[4], b[5]];
  const h2 = (n: number) => n.toString(16).padStart(2, "0");
  const groups = [0, 2, 4, 6].map((i) => (bytes[i] << 8) | bytes[i + 1]);
  return {
    groups,
    steps: [
      `MAC: ${b.map(h2).join(" ")}`,
      `แทรก FFFE ตรงกลาง: ${[b[0], b[1], b[2], 0xff, 0xfe, b[3], b[4], b[5]].map(h2).join(" ")}`,
      `byte แรก ${h2(b[0])} = ${b[0].toString(2).padStart(8, "0")} → กลับ bit ที่ 7 (U/L) → ${flipped.toString(2).padStart(8, "0")} = ${h2(flipped)}`,
      `Interface ID: ${groups.map((n) => n.toString(16).padStart(4, "0")).join(":")}`,
    ],
  };
}
