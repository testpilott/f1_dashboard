import { Zap } from "lucide-react";
import type { DriverSeasonSummary } from "@/lib/stats/driverSeason";
import { DriverSeasonStats } from "@/components/stats/DriverSeasonStats";
import { Skeleton } from "@/components/ui/skeleton";

export type DriverSeasonData = {
  season: string;
  driverId: string;
  summary: DriverSeasonSummary;
  resultsFeedLag?: {
    pendingRaceNames: string[];
    pendingRounds: number[];
    checkAgainAfterMs: number;
    asOf: string;
  } | null;
};

export default function DriverSeasonSection({
  seasonLoading,
  seasonStats,
}: {
  seasonLoading: boolean;
  seasonStats?: DriverSeasonData;
}) {
  return (
    <div className="px-5 py-3.5">
      <div className="flex items-center gap-1.5 mb-3">
        <Zap size={13} className="text-[var(--f1-red)] shrink-0" />
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          This Season
        </h3>
      </div>
      {seasonLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      )}
      {seasonStats?.resultsFeedLag && (
        <p className="mb-3 text-xs text-amber-500/90">
          Results feed update pending for: {seasonStats.resultsFeedLag.pendingRaceNames.join(", ")}. Auto-checking every 2 minutes.
        </p>
      )}
      {seasonStats?.summary && (
        <DriverSeasonStats summary={seasonStats.summary} />
      )}
    </div>
  );
}
