export default function ComingSoon({ phase, children }: { phase: number; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-muted">
      <p className="font-medium text-fg">กำลังพัฒนา — จะเพิ่มใน Phase {phase}</p>
      {children && <div className="mt-2 text-sm">{children}</div>}
    </div>
  );
}
