// IPv4 helpers using unsigned 32-bit integers.
export const toInt = (ip: string): number | null => {
  const m = ip.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  if (parts.some((p) => p > 255)) return null;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
};

export const toIp = (n: number) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");

export const maskInt = (prefix: number) => (prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0);

export const prefixFromMask = (mask: string): number | null => {
  const n = toInt(mask);
  if (n === null) return null;
  const bin = n.toString(2).padStart(32, "0");
  if (!/^1*0*$/.test(bin)) return null;
  return bin.indexOf("0") === -1 ? 32 : bin.indexOf("0");
};

export const toBinary = (n: number) => [24, 16, 8, 0].map((s) => ((n >>> s) & 255).toString(2).padStart(8, "0")).join(".");

export type SubnetInfo = {
  ip: string;
  prefix: number;
  mask: string;
  wildcard: string;
  network: string;
  broadcast: string;
  first: string;
  last: string;
  hosts: number;
  block: number; // total addresses
  cls: string;
  scope: string;
};

export function classOf(n: number): string {
  const o = n >>> 24;
  if (o === 0) return "-";
  if (o < 127) return "A";
  if (o === 127) return "Loopback";
  if (o < 192) return "B";
  if (o < 224) return "C";
  if (o < 240) return "D (multicast)";
  return "E (reserved)";
}

export function scopeOf(n: number): string {
  const inRange = (base: string, p: number) => ((n & maskInt(p)) >>> 0) === toInt(base);
  if (inRange("10.0.0.0", 8) || inRange("172.16.0.0", 12) || inRange("192.168.0.0", 16)) return "Private (RFC 1918)";
  if (inRange("127.0.0.0", 8)) return "Loopback";
  if (inRange("169.254.0.0", 16)) return "Link-local (APIPA)";
  if (inRange("100.64.0.0", 10)) return "Shared (CGNAT)";
  if (n >>> 28 === 0xe) return "Multicast";
  if (n >>> 28 === 0xf) return "Reserved";
  return "Public";
}

export function subnet(ipN: number, prefix: number): SubnetInfo {
  const mask = maskInt(prefix);
  const net = (ipN & mask) >>> 0;
  const size = 2 ** (32 - prefix);
  const bc = (net + size - 1) >>> 0;
  const hosts = prefix >= 31 ? (prefix === 31 ? 2 : 1) : size - 2;
  return {
    ip: toIp(ipN),
    prefix,
    mask: toIp(mask),
    wildcard: toIp(~mask >>> 0),
    network: toIp(net),
    broadcast: toIp(bc),
    first: prefix >= 31 ? toIp(net) : toIp(net + 1),
    last: prefix >= 31 ? toIp(bc) : toIp(bc - 1),
    hosts,
    block: size,
    cls: classOf(ipN),
    scope: scopeOf(ipN),
  };
}

/** Parse "10.1.2.3/24", "10.1.2.3 255.255.255.0" or "10.1.2.3 24". */
export function parseCidr(input: string): { ip: number; prefix: number } | null {
  const s = input.trim().replace(/\s+/g, " ");
  const m = s.match(/^([\d.]+)\s*(?:\/|\s)\s*([\d.]+)$/);
  if (!m) return null;
  const ip = toInt(m[1]);
  if (ip === null) return null;
  let prefix: number | null = null;
  if (/^\d{1,2}$/.test(m[2])) prefix = Number(m[2]);
  else prefix = prefixFromMask(m[2]);
  if (prefix === null || prefix < 0 || prefix > 32) return null;
  return { ip, prefix };
}

/** Smallest prefix whose usable host count covers `hosts`. */
export function prefixForHosts(hosts: number): number {
  for (let p = 30; p >= 1; p--) if (2 ** (32 - p) - 2 >= hosts) return p;
  return 0;
}
