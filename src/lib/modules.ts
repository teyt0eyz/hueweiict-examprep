export type Weight = "low" | "mid" | "high" | "critical";

export type Module = {
  id: string; // "M5"
  slug: string; // used in /lessons/[slug]
  title: string;
  titleTh: string;
  chapters: string; // chapters in Book 1
  weight: Weight;
  group: "foundation" | "routing-switching" | "services" | "advanced";
  phase: number; // build phase in which the content lands
};

export const MODULES: Module[] = [
  { id: "M1", slug: "network-fundamentals", title: "Network Fundamentals & TCP/IP", titleTh: "พื้นฐานเครือข่ายและ TCP/IP", chapters: "1–2", weight: "mid", group: "foundation", phase: 2 },
  { id: "M2", slug: "vrp-device-management", title: "VRP & Device Management", titleTh: "VRP และการจัดการอุปกรณ์", chapters: "3 (+เล่ม 2 บท 5)", weight: "mid", group: "foundation", phase: 2 },
  { id: "M3", slug: "ip-addressing-subnetting", title: "IP Addressing & Subnetting", titleTh: "IP Address และการแบ่ง Subnet", chapters: "4", weight: "critical", group: "foundation", phase: 2 },
  { id: "M4", slug: "static-routing", title: "Static Routing", titleTh: "Static Routing", chapters: "5", weight: "high", group: "routing-switching", phase: 2 },
  { id: "M5", slug: "ospf", title: "OSPF", titleTh: "OSPF", chapters: "6", weight: "critical", group: "routing-switching", phase: 2 },
  { id: "M6", slug: "ethernet-vlan", title: "Ethernet Switching & VLAN", titleTh: "Ethernet Switching และ VLAN", chapters: "7", weight: "critical", group: "routing-switching", phase: 2 },
  { id: "M7", slug: "stp-link-aggregation", title: "STP / Link Aggregation / Smart Link", titleTh: "STP, Link Aggregation และ Smart Link", chapters: "8", weight: "high", group: "routing-switching", phase: 3 },
  { id: "M8", slug: "acl-aaa", title: "ACL & AAA", titleTh: "ACL และ AAA", chapters: "9", weight: "high", group: "services", phase: 3 },
  { id: "M9", slug: "nat", title: "NAT", titleTh: "NAT", chapters: "10", weight: "high", group: "services", phase: 3 },
  { id: "M10", slug: "dhcp", title: "DHCP", titleTh: "DHCP", chapters: "11", weight: "mid", group: "services", phase: 3 },
  { id: "M11", slug: "wlan", title: "WLAN", titleTh: "WLAN", chapters: "12", weight: "mid", group: "services", phase: 3 },
  { id: "M12", slug: "ipv6", title: "IPv6", titleTh: "IPv6", chapters: "13", weight: "high", group: "services", phase: 3 },
  { id: "M13", slug: "wan-ppp-pppoe", title: "WAN: PPP / PPPoE", titleTh: "WAN: PPP และ PPPoE", chapters: "14", weight: "low", group: "advanced", phase: 4 },
  { id: "M14", slug: "campus-network-design", title: "Campus Network Design", titleTh: "การออกแบบ Campus Network", chapters: "15", weight: "mid", group: "advanced", phase: 4 },
  { id: "M15", slug: "snmp-ntp-om", title: "SNMP / NTP / O&M", titleTh: "SNMP, NTP และงาน O&M", chapters: "16", weight: "low", group: "advanced", phase: 4 },
  { id: "M16", slug: "sdn-nfv", title: "SDN & NFV", titleTh: "SDN และ NFV", chapters: "17", weight: "mid", group: "advanced", phase: 4 },
  { id: "M17", slug: "network-automation", title: "Network Automation (Python)", titleTh: "Network Automation ด้วย Python", chapters: "18", weight: "mid", group: "advanced", phase: 4 },
];

export const GROUPS: Record<Module["group"], string> = {
  foundation: "พื้นฐาน",
  "routing-switching": "Routing & Switching",
  services: "Network Services & Security",
  advanced: "WAN, Design & Automation",
};

export const WEIGHT_LABEL: Record<Weight, string> = {
  low: "ต่ำ",
  mid: "กลาง",
  high: "สูง",
  critical: "สูงมาก",
};

export function getModuleBySlug(slug: string) {
  return MODULES.find((m) => m.slug === slug);
}
