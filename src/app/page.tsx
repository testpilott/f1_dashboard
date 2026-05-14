import type { DriverStanding, ConstructorStanding, Race, WeatherForecast } from "@/lib/types";
import StandingsTables from "@/components/standings/StandingsTables";
import NextRaceCard from "@/components/next-race/NextRaceCard";
import { getDriverStandings, getConstructorStandings, getNextRace } from "@/lib/api/jolpica";
import { getWeatherForecast } from "@/lib/api/openmeteo";
import { CIRCUIT_COORDS } from "@/lib/constants";

export const metadata = {
  title: "F1 Dashboard · Championship Standings",
};

export default async function HomePage() {
  const [driversResult, constructorsResult, raceResult] = await Promise.allSettled([
    getDriverStandings("current"),
    getConstructorStandings("current"),
    getNextRace(),
  ]);

  const initialDrivers: DriverStanding[] =
    driversResult.status === "fulfilled" ? driversResult.value : [];
  const initialConstructors: ConstructorStanding[] =
    constructorsResult.status === "fulfilled" ? constructorsResult.value : [];
  const initialRace: Race | null = raceResult.status === "fulfilled" ? raceResult.value : null;

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

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
      {/* Left column — standings */}
      <section>
        <h1 className="text-2xl font-bold mb-4">Championship Standings</h1>
        <StandingsTables
          initialData={{ drivers: initialDrivers, constructors: initialConstructors }}
        />
      </section>

      {/* Right column — next race + quick links */}
      <aside className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-zinc-400 mb-3">Next Race</h2>
          <NextRaceCard initialRace={initialRace} initialWeather={initialWeather} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/weekend", label: "Race Weekend", sub: "Sessions & results" },
            { href: "/schedule", label: "Calendar", sub: "Full 2026 schedule" },
            { href: "/projections", label: "Projections", sub: "Monte Carlo sim" },
            { href: "/news", label: "News", sub: "Latest F1 news" },
          ].map(({ href, label, sub }) => (
            <a
              key={href}
              href={href}
              className="block bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg p-3 transition-colors"
            >
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>
            </a>
          ))}
        </div>
      </aside>
    </div>
  );
}
