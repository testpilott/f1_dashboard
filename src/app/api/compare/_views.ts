import { NextResponse } from "next/server";
import { cachedJson, serverError } from "@/lib/api/routeHelpers";
import {
  getSeasonRaceResults,
  getConstructorStandings,
} from "@/lib/api/jolpica";
import { seasonHeadToHead } from "@/lib/stats/headToHead";
import { constructorHeadToHead } from "@/lib/stats/constructorH2H";
import { readSnapshotOrFetch } from "@/lib/snapshots/readSnapshotOrFetch";
import type {
  SeasonResultsSnapshot,
  SnapshotSource,
  StandingsSnapshot,
} from "@/lib/snapshots/types";
import type { CircuitHistoryRow } from "@/lib/stats/compareHistory";

export async function handleSeasonView({
  season,
  driverA,
  driverB,
}: {
  season: string;
  driverA: string;
  driverB: string;
}) {
  try {
    const races = await getSeasonRaceResults(season);
    const stats = seasonHeadToHead(races, driverA, driverB);
    return NextResponse.json({ view: "season", season, driverA, driverB, stats });
  } catch (err) {
    return serverError("compare-season", err);
  }
}

export async function handleTeamsView({
  season,
  constructorA,
  constructorB,
}: {
  season: string;
  constructorA: string;
  constructorB: string;
}) {
  try {
    const [standingsPayload, seasonResultsPayload] = await Promise.all([
      readSnapshotOrFetch<StandingsSnapshot>({
        key: `standings-${season}`,
        dataClass: "liveStandings",
        liveFn: async () => ({
          drivers: [],
          constructors: await getConstructorStandings(season),
          snapshotAt: new Date().toISOString(),
          source: "live",
        }),
      }),
      readSnapshotOrFetch<SeasonResultsSnapshot>({
        key: `season-results-${season}`,
          dataClass: "historicalResults",
        liveFn: async () => ({
          races: await getSeasonRaceResults(season),
          snapshotAt: new Date().toISOString(),
          source: "live",
        }),
      }),
    ]);

    const standings = standingsPayload.constructors;
    const races = seasonResultsPayload.races;
    const stats = constructorHeadToHead(races as Parameters<typeof constructorHeadToHead>[0], constructorA, constructorB);

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

    const source = standingsPayload.source === "live" || seasonResultsPayload.source === "live"
      ? "live"
      : "jolpica" satisfies SnapshotSource;

    return cachedJson(
      {
        view: "teams",
        season,
        constructorA,
        constructorB,
        stats,
        context,
        snapshotAt: new Date().toISOString(),
        source,
      },
      "liveStandings"
    );
  } catch (err) {
    return serverError("compare-teams", err);
  }
}

export async function handleCircuitView({
  circuitId,
  driverA,
  driverB,
  getCircuitHistory,
}: {
  circuitId: string;
  driverA: string;
  driverB: string;
  getCircuitHistory: (driverA: string, driverB: string, circuitId: string) => Promise<CircuitHistoryRow[]>;
}) {
  try {
    const history = await getCircuitHistory(driverA, driverB, circuitId);
    return NextResponse.json({ circuitId, driverA, driverB, history });
  } catch (err) {
    return serverError("compare-circuit", err);
  }
}
