/**
 * Small secondary badge showing a season's sprint-win count next to the
 * official Wins column. Deliberately visually subordinate to the race-win
 * number: sprint victories don't count as wins in the championship
 * standings, so they get their own element instead of inflating that value.
 *
 * Uses the violet secondary-accent tokens — the design system's designated
 * hue for sprint/fastest-lap highlights (see globals.css).
 */
export default function SprintWinsChip({ count }: { count: number | undefined }) {
  if (!count || count < 1) return null;

  return (
    <span
      className="inline-flex items-center rounded px-1 py-0.5 text-[10px] font-mono font-semibold leading-none tabular-nums"
      style={{ backgroundColor: "var(--accent-2-muted)", color: "var(--accent-2)" }}
      title={`${count} sprint win${count === 1 ? "" : "s"}`}
      aria-label={`${count} sprint win${count === 1 ? "" : "s"}`}
    >
      {count}S
    </span>
  );
}
