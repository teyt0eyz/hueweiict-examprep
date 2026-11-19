"use client";

import type { ComponentType } from "react";
import SubnetLab from "./SubnetLab";
import OspfLab from "./OspfLab";
import StpLab from "./StpLab";
import VlanLab from "./VlanLab";
import AclLab from "./AclLab";
import NatLab from "./NatLab";
import Ipv6Lab from "./Ipv6Lab";

const LAB_COMPONENTS: Record<string, ComponentType> = {
  subnet: SubnetLab,
  ospf: OspfLab,
  stp: StpLab,
  vlan: VlanLab,
  acl: AclLab,
  nat: NatLab,
  ipv6: Ipv6Lab,
};

export const labReady = (slug: string) => slug in LAB_COMPONENTS;

export default function LabHost({ slug }: { slug: string }) {
  const C = LAB_COMPONENTS[slug];
  return C ? <C /> : null;
}
