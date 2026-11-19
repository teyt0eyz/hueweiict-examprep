"use client";

import type { ComponentType } from "react";
import SubnetLab from "./SubnetLab";

const LAB_COMPONENTS: Record<string, ComponentType> = {
  subnet: SubnetLab,
};

export const labReady = (slug: string) => slug in LAB_COMPONENTS;

export default function LabHost({ slug }: { slug: string }) {
  const C = LAB_COMPONENTS[slug];
  return C ? <C /> : null;
}
