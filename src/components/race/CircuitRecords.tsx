import type { CircuitRecords as CircuitRecordsType } from "@/lib/stats/circuitRecords";

export default function CircuitRecords({ records }: { records: CircuitRecordsType | null | undefined }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Circuit Records</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
        <div className="rounded-md bg-surface-3/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Most Wins</p>
          <p className="font-semibold">{records?.mostWins ? `${records.mostWins.name} (${records.mostWins.count})` : "-"}</p>
        </div>
        <div className="rounded-md bg-surface-3/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Most Poles</p>
          <p className="font-semibold">{records?.mostPoles ? `${records.mostPoles.name} (${records.mostPoles.count})` : "-"}</p>
        </div>
        <div className="rounded-md bg-surface-3/60 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Fastest Lap</p>
          <p className="font-semibold">{records?.fastestLap ? `${records.fastestLap.name} ${records.fastestLap.time} (${records.fastestLap.year})` : "-"}</p>
        </div>
      </div>
    </div>
  );
}
