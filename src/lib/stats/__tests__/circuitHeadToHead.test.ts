import { describe, expect, it } from "vitest";
import { circuitHeadToHead, type CircuitComparisonRow } from "@/lib/stats/circuitHeadToHead";

function row(
  year: number,
  aRacePos: number | null,
  bRacePos: number | null,
  aQualiPos: number | null,
  bQualiPos: number | null,
): CircuitComparisonRow {
  return {
    year,
    a: {
      race: aRacePos == null ? null : { position: aRacePos, points: 10, status: "Finished", fastestLap: null, hasFastestLap: false },
      quali: aQualiPos == null ? null : { position: aQualiPos, bestTime: "1:20.000" },
    },
    b: {
      race: bRacePos == null ? null : { position: bRacePos, points: 8, status: "Finished", fastestLap: null, hasFastestLap: false },
      quali: bQualiPos == null ? null : { position: bQualiPos, bestTime: "1:20.500" },
    },
  };
}

describe("circuitHeadToHead", () => {
  it("aggregates wins and podiums across multi-race history where A wins more", () => {
    const stats = circuitHeadToHead([
      row(2026, 1, 2, 1, 2),
      row(2025, 2, 3, 2, 5),
      row(2024, 1, 5, 3, 4),
    ]);

    expect(stats.winsA).toBe(2);
    expect(stats.winsB).toBe(0);
    expect(stats.podiumsA).toBe(3);
    expect(stats.podiumsB).toBe(2);
    expect(stats.bestQualiA).toBe(1);
    expect(stats.bestQualiB).toBe(2);
  });

  it("returns zeroed counters and null quali details for empty history", () => {
    const stats = circuitHeadToHead([]);
    expect(stats.winsA).toBe(0);
    expect(stats.winsB).toBe(0);
    expect(stats.podiumsA).toBe(0);
    expect(stats.podiumsB).toBe(0);
    expect(stats.bestQualiA).toBeNull();
    expect(stats.bestQualiB).toBeNull();
    expect(stats.bestQualiTimeA).toBeNull();
    expect(stats.bestQualiTimeB).toBeNull();
  });

  it("handles one-sided data where B has no race/quali entries", () => {
    const stats = circuitHeadToHead([
      row(2026, 3, null, 4, null),
    ]);

    expect(stats.winsA).toBe(0);
    expect(stats.winsB).toBe(0);
    expect(stats.podiumsA).toBe(1);
    expect(stats.podiumsB).toBe(0);
    expect(stats.bestQualiA).toBe(4);
    expect(stats.bestQualiB).toBeNull();
  });

  it("supports tied win totals", () => {
    const stats = circuitHeadToHead([
      row(2026, 1, 2, 1, 2),
      row(2025, 2, 1, 2, 1),
    ]);

    expect(stats.winsA).toBe(1);
    expect(stats.winsB).toBe(1);
  });
});