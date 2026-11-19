import Link from "next/link";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps } from "react";
import { Callout, CliWalk, Objectives, Pre, Table } from "@/components/lesson/Mdx";
import Topology from "@/components/Topology";

function A({ href = "", ...rest }: ComponentProps<"a">) {
  // internal links go through next/link so basePath is applied
  if (href.startsWith("/")) return <Link href={href} {...rest} />;
  return <a href={href} target="_blank" rel="noopener noreferrer" {...rest} />;
}

const components: MDXComponents = {
  a: A,
  pre: Pre,
  table: Table,
  Callout,
  CliWalk,
  Objectives,
  Topology,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
