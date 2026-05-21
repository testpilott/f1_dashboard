import type { Race } from "@/lib/types";
import { isDnf } from "@/lib/stats/common";
import { parseGrid, parsePoints, parsePosition } from "@/lib/stats/parsing";

export interface DriverSeasonRaceRow {
  round: number;
  raceName: string;
  grid: number;
  finish: number;
  points: number;
  status: string;
  fastestLap: boolean;
}

export interface DriverSeasonAggregates {
  races: number;
  wins: number;
  podiums: number;
  points: number;
  dnfs: number;
  fastestLaps: number;
  avgFinish: number;
  avgGrid: number;
}

export interface DriverSeasonSummary {
  driverId: string;
  season: string;
  rows: DriverSeasonRaceRow[];
  aggregates: DriverSeasonAggregates;
}

export function driverSeasonSummary(races: Race[], driverId: string): DriverSeasonSummary {
  const rows: DriverSeasonRaceRow[] = [];

  for (const race of races) {
    const result = (race.Results ?? []).find(
      (r) => r.Driver?.driverId === driverId
    );
    if (!result) continue;

    const finish = parsePosition(result.position);
    const grid = parseGrid(result.grid);
    const points = parsePoints(result.points);
    const fastestLap = result.FastestLap?.rank === "1";

    rows.push({
      round: parseInt(race.round, 10),
      raceName: race.raceName,
      grid,
      finish,
      points,
      status: result.status ?? "",
      fastestLap,
    });
  }

  const finishCounts = rows.filter((r) => r.finish <= 20).length;
  const gridCounts = rows.filter((r) => r.grid > 0).length;

  const aggregates: DriverSeasonAggregates = {
    races: rows.length,
    wins: rows.filter((r) => r.finish === 1).length,
    podiums: rows.filter((r) => r.finish <= 3).length,
    points: rows.reduce((s, r) => s + r.points, 0),
    dnfs: rows.filter((r) => isDnf(r.status)).length,
    fastestLaps: rows.filter((r) => r.fastestLap).length,
    avgFinish:
      finishCounts > 0
        ? Math.round((rows.filter((r) => r.finish <= 20).reduce((s, r) => s + r.finish, 0) / finishCounts) * 10) / 10
        : 0,
    avgGrid:
      gridCounts > 0
        ? Math.round((rows.filter((r) => r.grid > 0).reduce((s, r) => s + r.grid, 0) / gridCounts) * 10) / 10
        : 0,
  };

  // season/driverId filled by caller since races may be from any season
  return { driverId, season: races[0]?.season ?? "", rows, aggregates };
}
