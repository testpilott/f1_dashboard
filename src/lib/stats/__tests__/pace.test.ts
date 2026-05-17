import { describe, it, expect } from "vitest";
import { cleanedLaps, degradationSlope, stintSummaries, type LapPoint } from "@/lib/stats/pace";
import type { OpenF1Lap, OpenF1Stint } from "@/lib/types";

function lap(driver: number, n: number, dur: number | null): OpenF1Lap {
  return {
    session_key: 1,
    meeting_key: 1,
    driver_number: driver,
    lap_number: n,
    lap_duration: dur,
    date_start: "",
    duration_sector_1: null,
    duration_sector_2: null,
    duration_sector_3: null,
    i1_speed: null,
  } as OpenF1Lap;
}

function stint(driver: number, num: number, start: number, end: number, compound: OpenF1Stint["compound"] = "MEDIUM"): OpenF1Stint {
  return {
    session_key: 1,
    meeting_key: 1,
    driver_number: driver,
    stint_number: num,
    compound,
    lap_start: start,
    lap_end: end,
    tyre_age_at_start: 0,
  };
}

describe("cleanedLaps", () => {
  it("keeps only the driver's positive, finite laps, sorted by lap", () => {
    const laps = [lap(44, 3, 92.1), lap(44, 1, 91.5), lap(1, 1, 90.0), lap(44, 2, null)];
    expect(cleanedLaps(laps, 44)).toEqual([
      { lap: 1, sec: 91.5 },
      { lap: 3, sec: 92.1 },
    ]);
  });

  it("returns [] for a non-array input", () => {
    expect(cleanedLaps(undefined as unknown as OpenF1Lap[], 44)).toEqual([]);
  });

  it("drops zero / negative durations", () => {
    expect(cleanedLaps([lap(44, 1, 0), lap(44, 2, -5)], 44)).toEqual([]);
  });
});

describe("degradationSlope", () => {
  it("is 0 for fewer than 2 points", () => {
    expect(degradationSlope([{ lap: 1, sec: 90 }])).toBe(0);
    expect(degradationSlope([])).toBe(0);
  });

  it("computes a positive slope when laps get slower", () => {
    const pts: LapPoint[] = [
      { lap: 1, sec: 90 },
      { lap: 2, sec: 91 },
      { lap: 3, sec: 92 },
    ];
    expect(degradationSlope(pts)).toBeCloseTo(1, 6);
  });

  it("computes a negative slope when laps get faster (fuel burn)", () => {
    const pts: LapPoint[] = [
      { lap: 1, sec: 92 },
      { lap: 2, sec: 91 },
      { lap: 3, sec: 90 },
    ];
    expect(degradationSlope(pts)).toBeCloseTo(-1, 6);
  });

  it("is 0 when all laps share the same lap number (zero x-variance)", () => {
    expect(degradationSlope([{ lap: 5, sec: 90 }, { lap: 5, sec: 95 }])).toBe(0);
  });
});

describe("stintSummaries", () => {
  it("summarises pace and degradation per stint for one driver", () => {
    const laps = [
      lap(44, 1, 90), lap(44, 2, 91), lap(44, 3, 92), // stint 1
      lap(44, 4, 95), lap(44, 5, 95), // stint 2
      lap(1, 1, 80), // other driver — ignored
    ];
    const stints = [stint(44, 1, 1, 3, "SOFT"), stint(44, 2, 4, 5, "HARD")];
    const s = stintSummaries(laps, stints, 44);
    expect(s).toHaveLength(2);
    expect(s[0]).toMatchObject({ stintNumber: 1, compound: "SOFT", laps: 3 });
    expect(s[0].avgSec).toBeCloseTo(91, 6);
    expect(s[0].degradationSlope).toBeCloseTo(1, 6);
    expect(s[1]).toMatchObject({ stintNumber: 2, compound: "HARD", laps: 2 });
    expect(s[1].avgSec).toBeCloseTo(95, 6);
    expect(s[1].degradationSlope).toBe(0);
  });

  it("returns an empty stint list when the driver has no stints", () => {
    expect(stintSummaries([lap(44, 1, 90)], [stint(1, 1, 1, 3)], 44)).toEqual([]);
  });

  it("returns [] for a non-array stints input", () => {
    expect(stintSummaries([], undefined as unknown as OpenF1Stint[], 44)).toEqual([]);
  });

  it("reports zero avg/laps for a stint with no usable lap times", () => {
    const s = stintSummaries([lap(44, 1, null)], [stint(44, 1, 1, 3)], 44);
    expect(s[0]).toMatchObject({ laps: 0, avgSec: 0, degradationSlope: 0 });
  });
});
