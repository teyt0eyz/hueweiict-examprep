import diagrams from "../../content/diagrams.json";

type Node = { id: string; type: "router" | "switch" | "l3switch" | "pc" | "server" | "cloud" | "ap" | "ac" | "firewall"; x: number; y: number; label?: string; sub?: string };
type Link = { a: string; b: string; label?: string; la?: string; lb?: string; style?: "solid" | "dashed" | "blocked" | "trunk" | "wireless"; color?: "accent" | "danger" | "muted" };
type Area = { x: number; y: number; w: number; h: number; label: string };
export type TopologyData = { w: number; h: number; title?: string; nodes: Node[]; links: Link[]; areas?: Area[]; notes?: { x: number; y: number; text: string }[] };

const DIAGRAMS = diagrams as unknown as Record<string, TopologyData>;
export const hasDiagram = (name: string) => name in DIAGRAMS;

function Icon({ n }: { n: Node }) {
  const common = { stroke: "var(--accent)", strokeWidth: 1.8, fill: "var(--surface)" };
  switch (n.type) {
    case "router":
      return (
        <g>
          <ellipse cx={0} cy={0} rx={20} ry={14} {...common} />
          <path d="M-9 -4 L-3 0 L-9 4 M9 -4 L3 0 L9 4" fill="none" stroke="var(--accent)" strokeWidth={1.6} />
        </g>
      );
    case "switch":
    case "l3switch":
      return (
        <g>
          <rect x={-22} y={-12} width={44} height={24} rx={4} {...common} />
          <path d="M-12 -4 H10 M6 -7 L10 -4 L6 -1 M12 4 H-10 M-6 1 L-10 4 L-6 7" fill="none" stroke="var(--accent)" strokeWidth={1.4} />
          {n.type === "l3switch" && <text x={17} y={-15} fontSize={8} fill="var(--accent)">L3</text>}
        </g>
      );
    case "pc":
      return (
        <g>
          <rect x={-14} y={-13} width={28} height={19} rx={2} {...common} />
          <path d="M-7 12 H7 M0 6 V12" stroke="var(--accent)" strokeWidth={1.8} />
        </g>
      );
    case "server":
      return (
        <g>
          <rect x={-11} y={-17} width={22} height={34} rx={2} {...common} />
          <path d="M-6 -9 H6 M-6 -3 H6 M-6 3 H6" stroke="var(--accent)" strokeWidth={1.4} />
        </g>
      );
    case "cloud":
      return <path d="M-22 8 a10 10 0 0 1 2-19 a13 13 0 0 1 24-4 a10 10 0 0 1 16 10 a8 8 0 0 1 -2 13 Z" {...common} />;
    case "ap":
      return (
        <g>
          <circle r={8} {...common} />
          <path d="M-13 -9 a16 16 0 0 1 26 0 M-17 -14 a22 22 0 0 1 34 0" fill="none" stroke="var(--accent)" strokeWidth={1.4} />
        </g>
      );
    case "ac":
      return (
        <g>
          <rect x={-20} y={-11} width={40} height={22} rx={3} {...common} />
          <text y={4} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--accent)">AC</text>
        </g>
      );
    case "firewall":
      return (
        <g>
          <rect x={-18} y={-13} width={36} height={26} rx={2} {...common} />
          <path d="M-18 -4 H18 M-18 5 H18 M-6 -13 V-4 M6 -4 V5 M-6 5 V13" stroke="var(--accent)" strokeWidth={1.2} />
        </g>
      );
  }
}

const NODE_R: Record<Node["type"], number> = { router: 20, switch: 22, l3switch: 22, pc: 15, server: 15, cloud: 22, ap: 10, ac: 20, firewall: 18 };

export function TopologySvg({ data, label }: { data: TopologyData; label?: string }) {
  const byId = new Map(data.nodes.map((n) => [n.id, n]));
  return (
    <svg viewBox={`0 0 ${data.w} ${data.h}`} role="img" aria-label={label ?? data.title ?? "network topology"} className="h-auto w-full" style={{ maxHeight: 420 }}>
      {data.areas?.map((a, i) => (
        <g key={i}>
          <rect x={a.x} y={a.y} width={a.w} height={a.h} rx={14} fill="var(--accent-soft)" opacity={0.55} stroke="var(--accent)" strokeDasharray="5 4" strokeWidth={1} />
          <text x={a.x + 10} y={a.y + 16} fontSize={11} fontWeight={600} fill="var(--accent)">{a.label}</text>
        </g>
      ))}
      {data.links.map((l, i) => {
        const A = byId.get(l.a);
        const B = byId.get(l.b);
        if (!A || !B) return null;
        const color = l.color === "danger" || l.style === "blocked" ? "var(--danger)" : l.color === "accent" ? "var(--accent)" : "var(--muted)";
        const dash = l.style === "dashed" || l.style === "wireless" ? "6 5" : undefined;
        const mx = (A.x + B.x) / 2;
        const my = (A.y + B.y) / 2;
        const at = (t: number) => ({ x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t });
        const pa = at(0.26);
        const pb = at(0.74);
        return (
          <g key={i}>
            <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={color} strokeWidth={l.style === "trunk" ? 3.5 : 1.8} strokeDasharray={dash} />
            {l.style === "blocked" && (
              <g transform={`translate(${pb.x},${pb.y})`}>
                <circle r={7} fill="var(--surface)" stroke="var(--danger)" strokeWidth={1.6} />
                <path d="M-3.5 -3.5 L3.5 3.5 M3.5 -3.5 L-3.5 3.5" stroke="var(--danger)" strokeWidth={1.6} />
              </g>
            )}
            {l.label && (
              <text x={mx} y={my - 6} fontSize={10} textAnchor="middle" fill="var(--fg)" style={{ paintOrder: "stroke", stroke: "var(--surface)", strokeWidth: 3 }}>
                {l.label}
              </text>
            )}
            {l.la && (
              <text x={pa.x} y={pa.y + 13} fontSize={9} textAnchor="middle" fill="var(--muted)" style={{ paintOrder: "stroke", stroke: "var(--surface)", strokeWidth: 3 }}>
                {l.la}
              </text>
            )}
            {l.lb && (
              <text x={pb.x} y={pb.y + 13} fontSize={9} textAnchor="middle" fill="var(--muted)" style={{ paintOrder: "stroke", stroke: "var(--surface)", strokeWidth: 3 }}>
                {l.lb}
              </text>
            )}
          </g>
        );
      })}
      {data.nodes.map((n) => (
        <g key={n.id} transform={`translate(${n.x},${n.y})`}>
          <Icon n={n} />
          <text y={NODE_R[n.type] + 14} fontSize={11} fontWeight={600} textAnchor="middle" fill="var(--fg)">{n.label ?? n.id}</text>
          {n.sub && <text y={NODE_R[n.type] + 26} fontSize={9} textAnchor="middle" fill="var(--muted)">{n.sub}</text>}
        </g>
      ))}
      {data.notes?.map((t, i) => (
        <text key={i} x={t.x} y={t.y} fontSize={10} fill="var(--muted)">{t.text}</text>
      ))}
    </svg>
  );
}

export default function Topology({ name, caption }: { name: string; caption?: string }) {
  const data = DIAGRAMS[name];
  if (!data) return <p className="text-sm text-danger">[missing diagram: {name}]</p>;
  return (
    <figure className="not-prose my-5 rounded-xl border border-border bg-surface p-3">
      <TopologySvg data={data} label={caption} />
      {(caption ?? data.title) && <figcaption className="mt-2 text-center text-xs text-muted">{caption ?? data.title}</figcaption>}
    </figure>
  );
}
