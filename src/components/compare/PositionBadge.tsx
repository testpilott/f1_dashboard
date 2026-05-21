export default function PositionBadge({
  pos,
  status,
  fastest,
  color,
}: {
  pos: number | null;
  status?: string;
  fastest?: boolean;
  color: string;
}) {
  if (pos === null && status && !["Finished", ""].includes(status)) {
    return <span className="text-xs text-muted-foreground font-mono tabular-nums">{status.slice(0, 3)}</span>;
  }
  if (!pos) return <span className="text-xs text-muted-foreground/30">—</span>;
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="text-sm font-bold font-mono tabular-nums" style={{ color: pos <= 3 ? color : "var(--foreground)" }}>
        P{pos}
      </span>
      {fastest && <span className="text-[9px] text-accent-2 leading-none">⚡</span>}
    </span>
  );
}