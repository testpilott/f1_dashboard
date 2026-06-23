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

  // Aggregator state. Computed in a single pass over `rows` below so we don't
  // re-walk the list once per aggregate field (previous version did seven).
  let wins = 0;
  let podiums = 0;
  let pointsTotal = 0;
  let dnfs = 0;
  let fastestLaps = 0;
  let finishSum = 0;
  let finishCount = 0; // races with classified finish (1–20) — denominator for avgFinish
  let gridSum = 0;
  let gridCount = 0;   // races with a real grid slot (>0) — denominator for avgGrid

  for (const race of races) {
    const result = (race.Results ?? []).find(
      (r) => r.Driver?.driverId === driverId
    );
    if (!result) continue;

    const finish = parsePosition(result.position);
    const grid = parseGrid(result.grid);
    const points = parsePoints(result.points);
    const fastestLap = result.FastestLap?.rank === "1";
    const status = result.status ?? "";

    rows.push({
      round: parseInt(race.round, 10),
      raceName: race.raceName,
      grid,
      finish,
      points,
      status,
      fastestLap,
    });

    if (finish === 1) wins += 1;
    if (finish > 0 && finish <= 3) podiums += 1;
    pointsTotal += points;
    if (isDnf(status)) dnfs += 1;
    if (fastestLap) fastestLaps += 1;
    if (finish > 0 && finish <= 20) {
      finishSum += finish;
      finishCount += 1;
    }
    if (grid > 0) {
      gridSum += grid;
      gridCount += 1;
    }
  }

  const roundTo1dp = (n: number) => Math.round(n * 10) / 10;

  const aggregates: DriverSeasonAggregates = {
    races: rows.length,
    wins,
    podiums,
    points: pointsTotal,
    dnfs,
    fastestLaps,
    avgFinish: finishCount > 0 ? roundTo1dp(finishSum / finishCount) : 0,
    avgGrid: gridCount > 0 ? roundTo1dp(gridSum / gridCount) : 0,
  };

  // season/driverId filled by caller since races may be from any season
  return { driverId, season: races[0]?.season ?? "", rows, aggregates };
}
