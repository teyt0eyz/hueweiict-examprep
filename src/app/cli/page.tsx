import type { Metadata } from "next";
import CliBrowser, { type CliItem } from "@/components/CliBrowser";
import PageHeader from "@/components/PageHeader";
import { highlight } from "@/lib/highlight";
import data from "../../../content/cli.json";

export const metadata: Metadata = { title: "VRP CLI Cheatsheet" };

type Raw = { group: string; module: string; cmd: string; desc: string };

const CISCO: [string, string, string][] = [
  ["เข้าโหมดตั้งค่า", "system-view", "configure terminal"],
  ["ยกเลิกคำสั่ง", "undo …", "no …"],
  ["ดูสถานะ", "display …", "show …"],
  ["config ที่ทำงานอยู่", "display current-configuration", "show running-config"],
  ["บันทึก config", "save", "copy running-config startup-config / write"],
  ["ตั้งชื่อ", "sysname R1", "hostname R1"],
  ["ถอยกลับ user view", "return (Ctrl+Z)", "end (Ctrl+Z)"],
  ["ตาราง routing", "display ip routing-table", "show ip route"],
  ["สรุป interface", "display ip interface brief", "show ip interface brief"],
  ["static route", "ip route-static 10.0.0.0 24 192.168.1.2", "ip route 10.0.0.0 255.255.255.0 192.168.1.2"],
  ["OSPF neighbor", "display ospf peer brief", "show ip ospf neighbor"],
  ["พอร์ต access", "port link-type access + port default vlan 10", "switchport mode access + switchport access vlan 10"],
  ["พอร์ต trunk", "port trunk allow-pass vlan 10 20", "switchport trunk allowed vlan 10,20"],
  ["SVI / gateway VLAN", "interface Vlanif 10", "interface Vlan10"],
  ["Link aggregation", "interface Eth-Trunk 1", "interface Port-channel 1 / channel-group"],
  ["ใช้ ACL กับ interface", "traffic-filter inbound acl 3000", "ip access-group 101 in"],
  ["ACL ไม่ match rule ใด (กรอง traffic)", "permit (traffic-filter)", "deny (implicit deny)"],
  ["NAT ขาออกด้วย IP ของ interface", "nat outbound 2000", "ip nat inside source list 1 interface g0/1 overload"],
  ["DHCP pool", "ip pool NAME", "ip dhcp pool NAME"],
  ["DHCP relay", "dhcp select relay + dhcp relay server-ip", "ip helper-address"],
  ["ปิดการแบ่งหน้า", "screen-length 0 temporary", "terminal length 0"],
];

export default async function Page() {
  const items: CliItem[] = await Promise.all((data as Raw[]).map(async (r) => ({ ...r, html: await highlight(r.cmd, "vrp") })));
  return (
    <>
      <PageHeader title="VRP CLI Cheatsheet" subtitle={`คำสั่ง Huawei VRP ที่ใช้บ่อย ${items.length} คำสั่ง ค้นหาได้และกรองตามหัวข้อ · prompt บอก view: <R1> = user view, [R1] = system view, [R1-…] = view ย่อย`} />
      <CliBrowser items={items} />

      <section className="mt-12" aria-labelledby="cisco">
        <h2 id="cisco" className="text-lg font-semibold">ตารางเทียบ Huawei VRP กับ Cisco IOS</h2>
        <p className="mb-3 mt-1 text-sm text-muted">สำหรับผู้ที่คุ้นกับ Cisco — ในการสอบ HCIA ให้ใช้รูปแบบ VRP เท่านั้น</p>
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-surface-2 text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">งาน</th>
                <th className="px-3 py-2 font-medium">Huawei VRP</th>
                <th className="px-3 py-2 font-medium">Cisco IOS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {CISCO.map(([task, vrp, ios]) => (
                <tr key={task}>
                  <td className="px-3 py-2">{task}</td>
                  <td className="px-3 py-2 font-mono text-xs text-accent">{vrp}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted">{ios}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
