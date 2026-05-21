export default function StatBox({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-surface-3/60 rounded-lg p-2.5 text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-lg font-black font-mono ${highlight ? "text-medal-gold" : ""}`}>
        {value}
      </p>
    </div>
  );
}