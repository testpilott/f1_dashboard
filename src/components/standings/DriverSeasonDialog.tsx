"use client";

import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { fetchJson } from "@/lib/api/clientFetch";
import TeamLogo from "@/components/ui/TeamLogo";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogPortal,
  DialogBackdrop,
  DialogPopup,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { DriverSeasonStats } from "@/components/stats/DriverSeasonStats";
import { getTeamColor } from "@/lib/constants/teams";
import type { DriverStanding } from "@/lib/types";
import type { DriverSeasonSummary } from "@/lib/stats/driverSeason";

type DriverSeasonData = {
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

const CURRENT_SEASON_STALE_MS = 5 * 60 * 1000;
const HISTORICAL_SEASON_STALE_MS = 60 * 60 * 1000;
const RESULTS_FEED_RECHECK_MS = 24 * 60 * 60 * 1000;

async function fetchDriverSeason(season: string, driverId: string): Promise<DriverSeasonData> {
  const params = new URLSearchParams({
    season,
    driverId,
  });

  // Bucketed cache-buster avoids serving long-lived stale edge entries after
  // a race weekend update while still keeping requests deduplicated.
  if (season === "current") {
    params.set("_cb", String(Math.floor(Date.now() / CURRENT_SEASON_STALE_MS)));
  }

  return fetchJson<DriverSeasonData>(`/api/driver-season?${params.toString()}`);
}

export default function DriverSeasonDialog({
  driver,
  season,
  open,
  onOpenChange,
}: {
  driver: DriverStanding | null;
  season: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const team = driver?.Constructors[0]?.name ?? "Unknown";
  const color = getTeamColor(team);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["driver-season", season, driver?.Driver.driverId],
    queryFn: () => fetchDriverSeason(season, driver!.Driver.driverId),
    enabled: open && !!driver,
    staleTime: season === "current" ? CURRENT_SEASON_STALE_MS : HISTORICAL_SEASON_STALE_MS,
    refetchInterval: (query) => {
      const payload = query.state.data as DriverSeasonData | undefined;
      if (season !== "current") return false;
      return payload?.resultsFeedLag ? RESULTS_FEED_RECHECK_MS : false;
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          <div className="h-1 w-full rounded-t-xl" style={{ backgroundColor: color }} />

          <div className="flex items-center justify-between p-5 pb-3">
            <div className="flex items-center gap-3">
              <TeamLogo team={team} size={32} />
              <div>
                <span className="font-mono text-xs font-bold" style={{ color }}>
                  {driver?.Driver.code}
                </span>
                <DialogTitle className="text-lg font-bold leading-tight">
                  {driver?.Driver.givenName} {driver?.Driver.familyName}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">{team}</p>
              </div>
            </div>
            <DialogClose aria-label="Close">
              <X size={16} />
            </DialogClose>
          </div>

          <p className="px-5 pb-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            {season === "current" ? "Current Season" : `${season} Season`}
          </p>

          <div className="px-5 pb-5">
            {isLoading && (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            )}
            {isError && (
              <p className="text-sm text-muted-foreground">Failed to load season data.</p>
            )}
            {data?.resultsFeedLag && (
              <p className="mb-3 text-xs text-amber-500/90">
                Results feed update pending for: {data.resultsFeedLag.pendingRaceNames.join(", ")}. Auto-checking every 24 hours.
              </p>
            )}
            {data && <DriverSeasonStats summary={data.summary} />}
            {data && data.summary.rows.length === 0 && (
              <p className="text-sm text-muted-foreground">No race data available yet.</p>
            )}
          </div>

          <div className="h-4" />
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}