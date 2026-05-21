export default function StatBar({
  label,
  a,
  b,
  colorA,
  colorB,
}: {
  label: string;
  a: number;
  b: number;
  colorA: string;
  colorB: string;
}) {
  const total = a + b || 1;
  const pctA = Math.round((a / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-mono">
        <span style={{ color: colorA }} className={a > b ? "font-bold" : ""}>{a}</span>
        <span className="text-muted-foreground/50 text-[10px] uppercase tracking-wider">{label}</span>
        <span style={{ color: colorB }} className={b > a ? "font-bold" : ""}>{b}</span>
      </div>
      <div className="flex h-2 rounded overflow-hidden bg-surface-3">
        <div style={{ width: `${pctA}%`, backgroundColor: colorA }} className="transition-all" />
        <div style={{ flex: 1, backgroundColor: colorB }} className="transition-all" />
      </div>
    </div>
  );
}