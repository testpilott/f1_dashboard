import type { DriverStanding, ConstructorStanding, Race, WeatherForecast } from "@/lib/types";
import { Suspense } from "react";
import { QueryClient, HydrationBoundary, dehydrate } from "@tanstack/react-query";
import StandingsTables from "@/components/standings/StandingsTables";
import NextRaceCard from "@/components/next-race/NextRaceCard";
import { getDriverStandings, getConstructorStandings, getNextRace, getSeasonSprintResults } from "@/lib/api/jolpica";
import { getWeatherForecast } from "@/lib/api/openmeteo";
import { CIRCUIT_COORDS } from "@/lib/constants";
import { extractFulfilled } from "@/lib/api/promiseHelpers";
import { tallySprintWins, type SprintWinTallies } from "@/lib/stats/sprintWins";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "F1 Dashboard · Championship Standings",
};

export default async function HomePage() {
  const [driversResult, constructorsResult, raceResult, sprintResult] = await Promise.allSettled([
    getDriverStandings("current"),
    getConstructorStandings("current"),
    getNextRace(),
    getSeasonSprintResults("current").then(tallySprintWins),
  ]);

  const initialDrivers: DriverStanding[] = extractFulfilled(driversResult, []);
  const initialConstructors: ConstructorStanding[] = extractFulfilled(constructorsResult, []);
  const initialRace: Race | null = extractFulfilled<Race | null>(raceResult, null);
  const initialSprintWins: SprintWinTallies | null = extractFulfilled<SprintWinTallies | null>(sprintResult, null);

  const queryClient = new QueryClient();
  queryClient.setQueryData(["standings", "current"], {
    drivers: initialDrivers,
    constructors: initialConstructors,
    sprintWins: initialSprintWins,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        {/* Left column — standings */}
        <section>
          <h1 className="text-2xl font-bold mb-4">Championship Standings</h1>
          <StandingsTables
            initialData={{
              drivers: initialDrivers,
              constructors: initialConstructors,
              sprintWins: initialSprintWins,
            }}
          />
        </section>

        {/* Right column — next race + quick links (shown first on mobile) */}
        <aside className="space-y-6 order-first xl:order-last">
          <div>
              <h2 className="text-base font-semibold text-muted-foreground mb-3">Next Race</h2>
              <Suspense fallback={<div className="h-64 bg-surface-2 border border-border rounded-xl animate-pulse" />}>
                <NextRaceSection initialRace={initialRace} />
              </Suspense>
            </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/schedule", label: "Calendar", sub: "Full 2026 schedule" },
              { href: "/projections", label: "Projections", sub: "Monte Carlo sim" },
              { href: "/news", label: "News", sub: "Latest F1 news" },
            ].map(({ href, label, sub }) => (
              <a
                key={href}
                href={href}
                className="block bg-surface-2 border border-border hover:bg-accent rounded-lg p-3 transition-colors"
              >
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </a>
            ))}
          </div>
        </aside>
      </div>
    </HydrationBoundary>
  );
}

async function NextRaceSection({ initialRace }: { initialRace: Race | null }) {
  let initialWeather: WeatherForecast | null = null;
  const country = initialRace?.Circuit?.Location?.country;
  const coords = country ? CIRCUIT_COORDS[country] : undefined;
  if (coords) {
    try {
      initialWeather = await getWeatherForecast(coords.lat, coords.lng, coords.timezone);
    } catch {
      initialWeather = null;
    }
  }
  return <NextRaceCard initialRace={initialRace} initialWeather={initialWeather} />;
}
