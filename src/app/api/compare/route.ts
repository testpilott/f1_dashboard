import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { badRequest, serverError } from "@/lib/api/routeHelpers";
import {
  getRaceResultsAtCircuit,
  getQualifyingResultsAtCircuit,
  getSeasonRaceResults,
  getConstructorStandings,
  getDriverSeasons,
} from "@/lib/api/jolpica";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_ID, VALID_SEASON, VALID_COMPARE_VIEW } from "@/lib/validators";
import { seasonHeadToHead } from "@/lib/stats/headToHead";
import { constructorHeadToHead } from "@/lib/stats/constructorH2H";
import { REVALIDATE_6H } from "@/lib/cacheStrategy";
import {
  computeComparisonYears,
  chunk,
  buildCircuitHistoryRow,
  type CircuitHistoryRow,
} from "@/lib/stats/compareHistory";

export const revalidate = 300; // 5 min

const getCircuitHistoryCached = unstable_cache(
  async (driverA: string, driverB: string, circuitId: string): Promise<CircuitHistoryRow[]> => {
    const [seasonsA, seasonsB] = await Promise.all([
      getDriverSeasons(driverA),
      getDriverSeasons(driverB),
    ]);

    const years = computeComparisonYears(seasonsA, seasonsB);
    const history: CircuitHistoryRow[] = [];

    // Batch size of 3 keeps fan-out aligned with the per-service concurrency
    // cap (2) in `createApiFetcher`. Larger batches just queue inside the
    // limiter without speeding anything up and hurt tail latency.
    for (const batch of chunk(years, 3)) {
      const rows = await Promise.all(
        batch.map(async (year) => {
          const [race, quali] = await Promise.allSettled([
            getRaceResultsAtCircuit(String(year), circuitId),
            getQualifyingResultsAtCircuit(String(year), circuitId),
          ]);
          return buildCircuitHistoryRow(
            year,
            driverA,
            driverB,
            race.status === "fulfilled" ? race.value : [],
            quali.status === "fulfilled" ? quali.value : [],
          );
        }),
      );

      history.push(...rows.filter((r): r is CircuitHistoryRow => r !== null));
    }

    return history;
  },
  ["compare-circuit"],
  { revalidate: REVALIDATE_6H },
);

export async function GET(req: Request) {
  const blocked = rateLimited(req, "compare");
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const driverA = searchParams.get("driverA");
  const driverB = searchParams.get("driverB");
  const circuitId = searchParams.get("circuitId");
  const view = searchParams.get("view") ?? "circuit";
  const season = searchParams.get("season") ?? "current";

  if (!VALID_COMPARE_VIEW.has(view)) {
    return badRequest("Invalid view parameter");
  }

  if (view !== "teams") {
    if (!driverA || !driverB) {
      return badRequest("driverA and driverB are required");
    }
    if (!VALID_ID.test(driverA) || !VALID_ID.test(driverB)) {
      return badRequest("Invalid driver identifier");
    }
  }

  // ── Season-long head-to-head ────────────────────────────────────────────────
  if (view === "season") {
    const seasonDriverA = driverA as string;
    const seasonDriverB = driverB as string;
    if (!VALID_SEASON.test(season)) {
      return badRequest("Invalid season parameter");
    }
    try {
      const races = await getSeasonRaceResults(season);
      const stats = seasonHeadToHead(races, seasonDriverA, seasonDriverB);
      return NextResponse.json({ view: "season", season, driverA: seasonDriverA, driverB: seasonDriverB, stats });
    } catch (err) {
        return serverError("compare-season", err);
    }
  }

  // ── Constructor head-to-head ───────────────────────────────────────────────
  if (view === "teams") {
    if (!VALID_SEASON.test(season)) {
      return badRequest("Invalid season parameter");
    }
    const constructorA = searchParams.get("constructorA");
    const constructorB = searchParams.get("constructorB");
    if (!constructorA || !constructorB) {
      return badRequest("constructorA and constructorB are required for teams view");
    }
    if (!VALID_ID.test(constructorA) || !VALID_ID.test(constructorB)) {
      return badRequest("Invalid constructor identifier");
    }
    try {
      const [races, standings] = await Promise.all([
        getSeasonRaceResults(season),
        getConstructorStandings(season),
      ]);
      const stats = constructorHeadToHead(races, constructorA, constructorB);

      // Build per-constructor context
      function buildContext(conId: string) {
        const standing = standings.find((s) => s.Constructor.constructorId === conId);
        const allPositions: number[] = [];
        for (const race of races) {
          for (const r of race.Results ?? []) {
            if (r.Constructor?.constructorId === conId) {
              const pos = parseInt(r.position, 10);
              if (!isNaN(pos) && pos > 0) allPositions.push(pos);
            }
          }
        }
        return {
          position: standing ? parseInt(standing.position, 10) : null,
          wins: standing ? parseInt(standing.wins, 10) : 0,
          bestFinish: allPositions.length > 0 ? Math.min(...allPositions) : null,
          racesEntered: stats[conId === constructorA ? "a" : "b"].racesEntered,
        };
      }

      const context = {
        a: buildContext(constructorA),
        b: buildContext(constructorB),
      };

      return NextResponse.json({ view: "teams", season, constructorA, constructorB, stats, context });
    } catch (err) {
      return serverError("compare-teams", err);
    }
  }

  // ── Circuit history (default) ───────────────────────────────────────────────
  if (!circuitId) {
    return badRequest("circuitId is required for circuit view");
  }
  if (!VALID_ID.test(circuitId)) {
    return badRequest("Invalid circuit identifier");
  }

  try {
    const circuitDriverA = driverA as string;
    const circuitDriverB = driverB as string;

    const history = await getCircuitHistoryCached(circuitDriverA, circuitDriverB, circuitId);

    return NextResponse.json({ circuitId, driverA: circuitDriverA, driverB: circuitDriverB, history });
  } catch (err) {
    return serverError("compare-circuit", err);
  }
}

