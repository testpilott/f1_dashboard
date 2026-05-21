import type { Race, RaceResult } from "@/lib/types";

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

function isDnf(result: RaceResult): boolean {
  const s = result.status ?? "";
  return s !== "Finished" && !s.startsWith("+");
}

export function driverSeasonSummary(races: Race[], driverId: string): DriverSeasonSummary {
  const rows: DriverSeasonRaceRow[] = [];

  for (const race of races) {
    const result = (race.Results ?? []).find(
      (r) => r.Driver?.driverId === driverId
    );
    if (!result) continue;

    const finish = parseInt(result.position ?? "99", 10);
    const grid = parseInt(result.grid ?? "0", 10);
    const points = parseFloat(result.points ?? "0");
    const fastestLap = result.FastestLap?.rank === "1";

    rows.push({
      round: parseInt(race.round, 10),
      raceName: race.raceName,
      grid: isNaN(grid) ? 0 : grid,
      finish: isNaN(finish) ? 99 : finish,
      points: isNaN(points) ? 0 : points,
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
    dnfs: rows.filter((r) => isDnf({ status: r.status } as RaceResult)).length,
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
