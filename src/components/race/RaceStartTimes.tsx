export default function RaceStartTimes({
  venue,
  utc,
  browserLocal,
}: {
  venue: string | null;
  utc: string | null;
  browserLocal: string | null;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Race Start Times</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
        <div className="rounded-md bg-surface-3/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Circuit Local (GMT)</p>
          <p className="font-mono tabular-nums">{venue ?? "-"}</p>
        </div>
        <div className="rounded-md bg-surface-3/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">UTC</p>
          <p className="font-mono tabular-nums">{utc ?? "-"}</p>
        </div>
        <div className="rounded-md bg-surface-3/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Your Local</p>
          <p className="font-mono tabular-nums">{browserLocal ?? "-"}</p>
        </div>
      </div>
    </div>
  );
}
