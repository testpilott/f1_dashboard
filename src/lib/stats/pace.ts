/**
 * Race-pace analytics derived purely from OpenF1 lap & stint data.
 * No network — unit-testable in isolation.
 */
import type { OpenF1Lap, OpenF1Stint } from "@/lib/types";
import { mean } from "@/lib/stats/common";

export interface LapPoint {
  lap: number;
  /** Lap time in seconds. */
  sec: number;
}

export interface StintSummary {
  stintNumber: number;
  compound: OpenF1Stint["compound"];
  lapStart: number;
  lapEnd: number;
  /** Laps with a usable time inside the stint. */
  laps: number;
  /** Mean lap time (s); 0 when no usable laps. */
  avgSec: number;
  /** Tyre degradation: seconds gained per lap (positive = slowing down). */
  degradationSlope: number;
}

/** Driver's clean, timed laps (drops in/out/SC laps with null duration). */
export function cleanedLaps(
  laps: OpenF1Lap[],
  driverNumber: number,
): LapPoint[] {
  if (!Array.isArray(laps)) return [];
  return laps
    .filter(
      (l) =>
        l.driver_number === driverNumber &&
        typeof l.lap_duration === "number" &&
        Number.isFinite(l.lap_duration) &&
        l.lap_duration > 0,
    )
    .map((l) => ({ lap: l.lap_number, sec: l.lap_duration as number }))
    .sort((a, b) => a.lap - b.lap);
}

/**
 * Least-squares slope of seconds vs lap number.
 * Returns 0 for <2 points or a degenerate (zero-variance) x-range.
 */
export function degradationSlope(points: LapPoint[]): number {
  const n = points.length;
  if (n < 2) return 0;

  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (const { lap, sec } of points) {
    sx += lap;
    sy += sec;
    sxx += lap * lap;
    sxy += lap * sec;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return 0;
  return (n * sxy - sx * sy) / denom;
}

/** Per-stint pace summary for one driver. */
export function stintSummaries(
  laps: OpenF1Lap[],
  stints: OpenF1Stint[],
  driverNumber: number,
): StintSummary[] {
  if (!Array.isArray(stints)) return [];
  const clean = cleanedLaps(laps, driverNumber);

  return stints
    .filter((s) => s.driver_number === driverNumber)
    .sort((a, b) => a.stint_number - b.stint_number)
    .map((s) => {
      const inStint = clean.filter(
        (p) => p.lap >= s.lap_start && p.lap <= s.lap_end,
      );
      return {
        stintNumber: s.stint_number,
        compound: s.compound,
        lapStart: s.lap_start,
        lapEnd: s.lap_end,
        laps: inStint.length,
        avgSec: mean(inStint.map((p) => p.sec)),
        degradationSlope: degradationSlope(inStint),
      };
    });
}
