import type { ReactElement, ReactNode } from "react";
import { highlight } from "@/lib/highlight";

/** Fenced code block → Shiki (build time). */
export async function Pre({ children }: { children?: ReactNode }) {
  const child = children as ReactElement<{ className?: string; children?: ReactNode }> | undefined;
  const lang = child?.props?.className?.replace(/^language-/, "") ?? "text";
  const code = typeof child?.props?.children === "string" ? child.props.children : String(child?.props?.children ?? "");
  const html = await highlight(code, lang);
  return <div className="not-prose code-block" dangerouslySetInnerHTML={{ __html: html }} />;
}

/** VRP config walkthrough: each command line paired with an explanation. */
export async function CliWalk({ device, title, lines }: { device?: string; title?: string; lines: [string, string][] }) {
  const rendered = await Promise.all(lines.map(([cmd]) => highlight(cmd, "vrp")));
  return (
    <figure className="not-prose my-6 overflow-hidden rounded-xl border border-border">
      <figcaption className="flex items-center gap-2 border-b border-border bg-surface-2 px-4 py-2 text-xs">
        <span className="rounded bg-accent px-1.5 py-0.5 font-mono font-semibold text-accent-fg">VRP</span>
        {device && <span className="font-mono font-semibold">{device}</span>}
        {title && <span className="text-muted">{title}</span>}
      </figcaption>
      <ol className="cli-walk divide-y divide-border bg-surface">
        {lines.map(([, exp], i) => (
          <li key={i} className="grid gap-1 px-3 py-2 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] sm:gap-4">
            <div className="min-w-0" dangerouslySetInnerHTML={{ __html: rendered[i] }} />
            <p className="text-sm leading-6 text-muted">{exp}</p>
          </li>
        ))}
      </ol>
    </figure>
  );
}

const CALLOUT = {
  exam: { label: "จุดที่มักออกสอบ", cls: "border-accent bg-accent-soft/60", icon: "🎯" },
  trap: { label: "กับดักที่พบบ่อย", cls: "border-danger/60 bg-danger/5", icon: "⚠️" },
  tip: { label: "Tip", cls: "border-border bg-surface-2", icon: "💡" },
  note: { label: "หมายเหตุ", cls: "border-border bg-surface", icon: "📝" },
} as const;

export function Callout({ type = "note", title, children }: { type?: keyof typeof CALLOUT; title?: string; children: ReactNode }) {
  const c = CALLOUT[type];
  return (
    <aside className={`not-prose my-6 rounded-xl border-l-4 border p-4 ${c.cls}`}>
      <p className="mb-2 font-semibold">
        <span aria-hidden>{c.icon}</span> {title ?? c.label}
      </p>
      <div className="callout-body space-y-2 text-[0.95rem] leading-7">{children}</div>
    </aside>
  );
}

export function Objectives({ items }: { items: string[] }) {
  return (
    <section className="not-prose mb-8 rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-2 text-base font-semibold">วัตถุประสงค์</h2>
      <ul className="list-disc space-y-1 pl-5 text-[0.95rem]">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </section>
  );
}

export function Table({ children }: { children?: ReactNode }) {
  return (
    <div className="table-wrap">
      <table>{children}</table>
    </div>
  );
}
