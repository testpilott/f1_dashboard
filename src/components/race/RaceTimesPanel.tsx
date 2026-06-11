import { Skeleton } from "@/components/ui/skeleton";
import RaceStartTimes from "@/components/race/RaceStartTimes";
import CircuitRecords from "@/components/race/CircuitRecords";
import type { CircuitRecords as CircuitRecordsType } from "@/lib/stats/circuitRecords";

export default function RaceTimesPanel({
  venue,
  utc,
  browserLocal,
  circuitRecords,
  circuitRecordsLoading,
}: {
  venue: string | null;
  utc: string | null;
  browserLocal: string | null;
  circuitRecords: CircuitRecordsType | null | undefined;
  circuitRecordsLoading: boolean;
}) {
  return (
    <div className="mt-3 space-y-2">
      <RaceStartTimes
        venue={venue}
        utc={utc}
        browserLocal={browserLocal}
      />
      {circuitRecordsLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <CircuitRecords records={circuitRecords} />
      )}
    </div>
  );
}
