import type { DriverStanding, ConstructorStanding } from "@/lib/types";
import StandingsTables from "@/components/standings/StandingsTables";
import { getDriverStandings, getConstructorStandings } from "@/lib/api/jolpica";

export const metadata = {
  title: "F1 Dashboard · Championship Standings",
};

export default async function StandingsPage() {
  const [driversResult, constructorsResult] = await Promise.allSettled([
    getDriverStandings("current"),
    getConstructorStandings("current"),
  ]);

  const initialDrivers: DriverStanding[] =
    driversResult.status === "fulfilled" ? driversResult.value : [];
  const initialConstructors: ConstructorStanding[] =
    constructorsResult.status === "fulfilled" ? constructorsResult.value : [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Championship Standings</h1>
      <StandingsTables
        initialData={{ drivers: initialDrivers, constructors: initialConstructors }}
      />
    </div>
  );
}
