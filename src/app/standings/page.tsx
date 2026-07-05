import { Suspense } from "react";
import { QueryClient, HydrationBoundary, dehydrate } from "@tanstack/react-query";
import type { DriverStanding, ConstructorStanding } from "@/lib/types";
import StandingsTables from "@/components/standings/StandingsTables";
import SeasonPicker from "@/components/ui/SeasonPicker";
import { getDriverStandings, getConstructorStandings, getSeasonSprintResults } from "@/lib/api/jolpica";
import { normalizeSeason, seasonLabel } from "@/lib/season";
import { extractFulfilled } from "@/lib/api/promiseHelpers";
import { tallySprintWins, type SprintWinTallies } from "@/lib/stats/sprintWins";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "F1 Dashboard · Championship Standings",
};

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season: rawSeason } = await searchParams;
  const season = normalizeSeason(rawSeason ?? null);

  const [driversResult, constructorsResult, sprintResult] = await Promise.allSettled([
    getDriverStandings(season),
    getConstructorStandings(season),
    getSeasonSprintResults(season).then(tallySprintWins),
  ]);

  const initialDrivers: DriverStanding[] = extractFulfilled(driversResult, []);
  const initialConstructors: ConstructorStanding[] = extractFulfilled(constructorsResult, []);
  const initialSprintWins: SprintWinTallies | null = extractFulfilled<SprintWinTallies | null>(sprintResult, null);

  const queryClient = new QueryClient();
  queryClient.setQueryData(["standings", season], {
    drivers: initialDrivers,
    constructors: initialConstructors,
    sprintWins: initialSprintWins,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{seasonLabel(season)} Standings</h1>
          <Suspense>
            <SeasonPicker current={season} />
          </Suspense>
        </div>
        <StandingsTables
          season={season}
          initialData={{
            drivers: initialDrivers,
            constructors: initialConstructors,
            sprintWins: initialSprintWins,
          }}
        />
      </div>
    </HydrationBoundary>
  );
}
