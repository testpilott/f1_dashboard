import type { ReactNode } from "react";

export default function StatBox({
  label,
  value,
  highlight = false,
  badge,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  /** Optional secondary element rendered beside the value (e.g. sprint-wins chip). */
  badge?: ReactNode;
}) {
  return (
    <div className="bg-surface-3/60 rounded-lg p-2.5 text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <p
        className={`text-lg font-black font-mono inline-flex items-center justify-center gap-1.5 ${highlight ? "text-medal-gold" : ""}`}
      >
        {value}
        {badge}
      </p>
    </div>
  );
}
