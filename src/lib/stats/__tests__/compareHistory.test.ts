import { describe, expect, it } from "vitest";
import {
  computeComparisonYears,
  chunk,
  buildCircuitHistoryRow,
} from "@/lib/stats/compareHistory";
import type { RaceResult, QualifyingResult } from "@/lib/types";

describe("computeComparisonYears", () => {
  it("unions years from both drivers, sorted descending", () => {
    expect(computeComparisonYears([2010, 2011], [2009, 2011])).toEqual([2011, 2010, 2009]);
  });

  it("returns empty array when both inputs are empty", () => {
    expect(computeComparisonYears([], [])).toEqual([]);
  });

  it("returns only A's years when B is empty", () => {
    expect(computeComparisonYears([2021, 2022], [])).toEqual([2022, 2021]);
  });

  it("deduplicates overlapping years", () => {
    const result = computeComparisonYears([2020, 2021], [2020, 2021]);
    expect(result).toEqual([2021, 2020]);
  });
});

describe("chunk", () => {
  it("splits array into chunks of size n", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns empty array for empty input", () => {
    expect(chunk([], 2)).toEqual([]);
  });

  it("returns single chunk when array length <= n", () => {
    expect(chunk([1, 2, 3], 5)).toEqual([[1, 2, 3]]);
  });

  it("handles n = 1", () => {
    expect(chunk([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
  });
});

const makeRace = (driverId: string, overrides: Partial<RaceResult> = {}): RaceResult => ({
  number: "1",
  position: "1",
  positionText: "1",
  points: "25",
  Driver: { driverId, permanentNumber: "1", code: "TST", url: "", givenName: "Test", familyName: "Driver", dateOfBirth: "1990-01-01", nationality: "British" },
  Constructor: { constructorId: "team", url: "", name: "Team", nationality: "British" },
  grid: "1",
  laps: "50",
  status: "Finished",
  Time: undefined,
  FastestLap: undefined,
  ...overrides,
});

const makeQuali = (driverId: string, overrides: Partial<QualifyingResult> = {}): QualifyingResult => ({
  number: "1",
  position: "1",
  Driver: { driverId, permanentNumber: "1", code: "TST", url: "", givenName: "Test", familyName: "Driver", dateOfBirth: "1990-01-01", nationality: "British" },
  Constructor: { constructorId: "team", url: "", name: "Team", nationality: "British" },
  Q1: "1:20.000",
  Q2: "1:19.500",
  Q3: "1:18.900",
  ...overrides,
});

describe("buildCircuitHistoryRow", () => {
  it("builds a row when both drivers have data", () => {
    const row = buildCircuitHistoryRow(
      2023,
      "hamilton",
      "verstappen",
      [makeRace("hamilton", { position: "2", points: "18" }), makeRace("verstappen", { position: "1", points: "25" })],
      [makeQuali("hamilton"), makeQuali("verstappen")]
    );
    expect(row).not.toBeNull();
    expect(row?.year).toBe(2023);
    expect(row?.a.race?.position).toBe(2);
    expect(row?.b.race?.position).toBe(1);
    expect(row?.a.quali?.bestTime).toBe("1:18.900");
  });

  it("returns null when neither driver appears in the data", () => {
    const row = buildCircuitHistoryRow(2023, "hamilton", "verstappen", [], []);
    expect(row).toBeNull();
  });

  it("returns null when only other drivers appear", () => {
    const row = buildCircuitHistoryRow(
      2023,
      "hamilton",
      "verstappen",
      [makeRace("alonso")],
      [makeQuali("alonso")]
    );
    expect(row).toBeNull();
  });

  it("builds a partial row when only driver A has data", () => {
    const row = buildCircuitHistoryRow(
      2022,
      "hamilton",
      "verstappen",
      [makeRace("hamilton")],
      []
    );
    expect(row).not.toBeNull();
    expect(row?.a.race?.position).toBe(1);
    expect(row?.b.race).toBeNull();
    expect(row?.b.quali).toBeNull();
  });

  it("records hasFastestLap when FastestLap.rank is '1'", () => {
    const row = buildCircuitHistoryRow(
      2023,
      "hamilton",
      "verstappen",
      [makeRace("hamilton", { FastestLap: { rank: "1", lap: "45", AverageSpeed: { units: "kph", speed: "220" }, Time: { time: "1:16.234" } } })],
      []
    );
    expect(row?.a.race?.hasFastestLap).toBe(true);
    expect(row?.a.race?.fastestLap).toBe("1:16.234");
  });
});
