import { Suspense } from "react";
import type { DriverStanding, ConstructorStanding } from "@/lib/types";
import StandingsTables from "@/components/standings/StandingsTables";
import SeasonPicker from "@/components/ui/SeasonPicker";
import { getDriverStandings, getConstructorStandings } from "@/lib/api/jolpica";

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
  const season = /^\d{4}$/.test(rawSeason ?? "") ? rawSeason! : "current";

  const [driversResult, constructorsResult] = await Promise.allSettled([
    getDriverStandings(season),
    getConstructorStandings(season),
  ]);

  const initialDrivers: DriverStanding[] =
    driversResult.status === "fulfilled" ? driversResult.value : [];
  const initialConstructors: ConstructorStanding[] =
    constructorsResult.status === "fulfilled" ? constructorsResult.value : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Championship Standings</h1>
        <Suspense>
          <SeasonPicker current={season} />
        </Suspense>
      </div>
      <StandingsTables
        season={season}
        initialData={{ drivers: initialDrivers, constructors: initialConstructors }}
      />
    </div>
  );
}
