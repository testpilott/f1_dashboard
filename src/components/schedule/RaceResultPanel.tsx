"use client";

import { useQuery } from "@tanstack/react-query";
import type { RaceResult } from "@/lib/types";
import { fetchJson } from "@/lib/api/clientFetch";
import { Skeleton } from "@/components/ui/skeleton";
import ResultTable from "@/components/race/ResultTable";

/** Completed race results are static — no reason to refetch within a visit. */
const RESULT_STALE_MS = 60 * 60 * 1000;

async function fetchRaceResults(season: string, round: string): Promise<RaceResult[]> {
  const d = await fetchJson<{ results?: RaceResult[] }>(
    `/api/results?season=${encodeURIComponent(season)}&round=${encodeURIComponent(round)}`,
  );
  return Array.isArray(d.results) ? d.results : [];
}

/**
 * Race classification shown inside an expanded schedule row once a race has
 * finished — replaces the session-timings list, which is no longer useful.
 * Mounted only on expand, so the fetch is lazy: collapsed rows cost nothing.
 * Rendering (position, DNF badges, time/status, points) reuses ResultTable.
 */
export default function RaceResultPanel({ season, round }: { season: string; round: string }) {
  const { data: results, isLoading, isError } = useQuery({
    queryKey: ["schedule-race-result", season, round],
    queryFn: () => fetchRaceResults(season, round),
    staleTime: RESULT_STALE_MS,
  });

  if (isLoading) {
    return (
      <div className="space-y-2 py-2" data-testid="race-result-loading">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-muted-foreground text-sm py-2">Could not load race results.</p>;
  }

  if (!results?.length) {
    return (
      <p className="text-muted-foreground text-sm py-2">
        Results not yet available — check back shortly after the race.
      </p>
    );
  }

  return <ResultTable type="race" title="Race result" initialData={results} />;
}
