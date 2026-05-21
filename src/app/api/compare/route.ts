import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api/routeHelpers";
import {
  getRaceResultsAtCircuit,
  getQualifyingResultsAtCircuit,
  getSeasonRaceResults,
  getConstructorStandings,
} from "@/lib/api/jolpica";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_ID, VALID_SEASON, VALID_COMPARE_VIEW } from "@/lib/validators";
import { seasonHeadToHead } from "@/lib/stats/headToHead";
import { constructorHeadToHead } from "@/lib/stats/constructorH2H";

export const revalidate = 300; // 5 min

const CURRENT_YEAR = new Date().getFullYear();
const HISTORY_YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3];

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
      return serverError("compare?view=season", err);
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
      return serverError("compare?view=teams", err);
    }
  }

  // ── Circuit history (default) ───────────────────────────────────────────────
  if (!circuitId) {
    return badRequest("circuitId is required for circuit view");
  }
  if (!VALID_ID.test(circuitId)) {
    return badRequest("Invalid circuit identifier");
  }

  const yearResults = await Promise.all(
    HISTORY_YEARS.map(async (year) => {
      const [race, quali] = await Promise.allSettled([
        getRaceResultsAtCircuit(String(year), circuitId),
        getQualifyingResultsAtCircuit(String(year), circuitId),
      ]);
      return {
        year,
        race: race.status === "fulfilled" ? race.value : [],
        quali: quali.status === "fulfilled" ? quali.value : [],
      };
    })
  );

  const history = yearResults
    .filter(({ race, quali }) => race.length > 0 || quali.length > 0)
    .map(({ year, race, quali }) => {
      const circuitDriverA = driverA as string;
      const circuitDriverB = driverB as string;
      const pick = (driverId: string) => {
        const r = race.find((x) => x.Driver.driverId === driverId);
        const q = quali.find((x) => x.Driver.driverId === driverId);
        return {
          race: r
            ? {
                position: parseInt(r.position, 10) || null,
                points: parseFloat(r.points),
                status: r.status,
                fastestLap: r.FastestLap?.Time?.time ?? null,
                hasFastestLap: r.FastestLap?.rank === "1",
              }
            : null,
          quali: q
            ? {
                position: parseInt(q.position, 10) || null,
                bestTime: q.Q3 ?? q.Q2 ?? q.Q1 ?? null,
              }
            : null,
        };
      };
      return { year, a: pick(circuitDriverA), b: pick(circuitDriverB) };
    });

  return NextResponse.json({ circuitId, driverA, driverB, history });
}

