"use client";

import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchJson } from "@/lib/api/clientFetch";
import type { LapSeriesPoint, PitstopMarker } from "@/lib/stats/lapAnalysis";

const LapTimeFallbackChart = dynamic(() => import("@/components/race/LapTimeFallbackChart"), {
  ssr: false,
  loading: () => <Skeleton className="h-72 w-full" />,
});

interface RaceLapsResponse {
  year: string;
  round: string;
  series: LapSeriesPoint[];
  pitstops: PitstopMarker[];
}

async function fetchRaceLaps(year: string, round: string): Promise<RaceLapsResponse> {
  return fetchJson<RaceLapsResponse>(`/api/race-laps?year=${year}&round=${round}`);
}

/** Pre-2023 races have no OpenF1 stint data — fall back to a raw lap-time chart. */
export default function TelemetryFallback({ year, round }: { year: string; round: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["race-laps", year, round],
    queryFn: () => fetchRaceLaps(year, round),
    staleTime: 6 * 60 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-2 mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-muted-foreground text-sm mt-4">
        Fallback lap chart could not be loaded. Please try again later.
      </p>
    );
  }

  if (!data?.series?.length) {
    return (
      <p className="text-muted-foreground text-sm mt-4">
        No telemetry available for this race. {" "}
        <span className="text-muted-foreground/70">
          Live timing data is provided by OpenF1 for 2023 onwards.
        </span>
      </p>
    );
  }

  return (
    <div className="mt-4">
      <LapTimeFallbackChart series={data?.series ?? []} pitstops={data?.pitstops ?? []} />
    </div>
  );
}
