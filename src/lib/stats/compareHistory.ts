import type { RaceResult, QualifyingResult } from "@/lib/types";

export interface CircuitHistoryRow {
  year: number;
  a: DriverCircuitResult;
  b: DriverCircuitResult;
}

export interface DriverCircuitResult {
  race: {
    position: number | null;
    points: number;
    status: string;
    fastestLap: string | null;
    hasFastestLap: boolean;
  } | null;
  quali: {
    position: number | null;
    bestTime: string | null;
  } | null;
}

/**
 * Compute the union of years both drivers may have competed.
 * Returns years descending (most recent first).
 */
export function computeComparisonYears(
  seasonsA: number[],
  seasonsB: number[]
): number[] {
  const union = new Set([...seasonsA, ...seasonsB]);
  return Array.from(union).sort((a, b) => b - a);
}

/**
 * Split an array into chunks of size n.
 */
export function chunk<T>(arr: T[], n: number): T[][] {
  if (n <= 0 || arr.length === 0) return [];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += n) {
    result.push(arr.slice(i, i + n));
  }
  return result;
}

/**
 * Build one circuit-history row from race + qualifying results for two drivers.
 * Returns null if neither driver appears in this year's results.
 */
export function buildCircuitHistoryRow(
  year: number,
  driverA: string,
  driverB: string,
  race: RaceResult[],
  quali: QualifyingResult[]
): CircuitHistoryRow | null {
  const rA = race.find((x) => x.Driver.driverId === driverA);
  const rB = race.find((x) => x.Driver.driverId === driverB);
  const qA = quali.find((x) => x.Driver.driverId === driverA);
  const qB = quali.find((x) => x.Driver.driverId === driverB);

  if (!rA && !rB && !qA && !qB) return null;

  function pickResult(r: RaceResult | undefined, q: QualifyingResult | undefined): DriverCircuitResult {
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
  }

  return {
    year,
    a: pickResult(rA, qA),
    b: pickResult(rB, qB),
  };
}
