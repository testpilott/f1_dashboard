import { describe, it, expect } from "vitest";
import { runProjections } from "@/lib/projections/montecarlo";
import type { DriverStanding, Race } from "@/lib/types";
import { makeRace, makeDriverStanding, makeDriver, makeConstructor } from "@/test/fixtures";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

// Two-driver standings: leader far ahead, chaser well behind
const STANDINGS_2: DriverStanding[] = [
  makeDriverStanding({
    position: "1",
    positionText: "1",
    points: "300",
    Driver: makeDriver({ driverId: "max", code: "VER", givenName: "Max", familyName: "Verstappen" }),
    Constructors: [makeConstructor({ constructorId: "red_bull", name: "Red Bull" })],
  }),
  makeDriverStanding({
    position: "2",
    positionText: "2",
    points: "50",
    Driver: makeDriver({ driverId: "lec", code: "LEC", givenName: "Charles", familyName: "Leclerc" }),
    Constructors: [makeConstructor({ constructorId: "ferrari", name: "Ferrari" })],
  }),
];

// Complete schedule: 3 completed + 5 remaining races
const SCHEDULE_8: Race[] = Array.from({ length: 8 }, (_, i) =>
  makeRace({ round: String(i + 1) })
);

// ─── Output shape ─────────────────────────────────────────────────────────────

describe("runProjections() — output shape", () => {
  const result = runProjections(STANDINGS_2, SCHEDULE_8, 3);

  it("returns the correct season", () => {
    expect(result.season).toBe(2026);
  });

  it("returns the correct number of remaining races", () => {
    expect(result.remainingRaces).toBe(5);
  });

  it("reports totalSimulations", () => {
    expect(result.totalSimulations).toBe(10_000);
  });

  it("returns a driver entry for each driver in standings", () => {
    expect(result.drivers).toHaveLength(STANDINGS_2.length);
  });

  it("includes a generatedAt ISO timestamp", () => {
    expect(() => new Date(result.generatedAt)).not.toThrow();
    expect(new Date(result.generatedAt).getTime()).toBeGreaterThan(0);
  });
});

// ─── Driver projection fields ────────────────────────────────────────────────

describe("runProjections() — driver projection fields", () => {
  const result = runProjections(STANDINGS_2, SCHEDULE_8, 3);

  it("includes all required fields per driver", () => {
    for (const d of result.drivers) {
      expect(d).toHaveProperty("driverId");
      expect(d).toHaveProperty("driverCode");
      expect(d).toHaveProperty("fullName");
      expect(d).toHaveProperty("teamName");
      expect(d).toHaveProperty("teamColour");
      expect(d).toHaveProperty("currentPoints");
      expect(d).toHaveProperty("projectedPoints");
      expect(d.projectedPoints).toHaveProperty("p10");
      expect(d.projectedPoints).toHaveProperty("p50");
      expect(d.projectedPoints).toHaveProperty("p90");
      expect(d).toHaveProperty("winProbability");
      expect(d).toHaveProperty("podiumProbability");
      expect(d).toHaveProperty("top5Probability");
    }
  });

  it("preserves currentPoints from input standings", () => {
    const ver = result.drivers.find((d) => d.driverId === "max")!;
    expect(ver.currentPoints).toBe(300);
  });

  it("sets percentile order: p10 ≤ p50 ≤ p90", () => {
    for (const d of result.drivers) {
      expect(d.projectedPoints.p10).toBeLessThanOrEqual(d.projectedPoints.p50);
      expect(d.projectedPoints.p50).toBeLessThanOrEqual(d.projectedPoints.p90);
    }
  });

  it("win/podium/top5 probabilities are in [0, 100]", () => {
    for (const d of result.drivers) {
      expect(d.winProbability).toBeGreaterThanOrEqual(0);
      expect(d.winProbability).toBeLessThanOrEqual(100);
      expect(d.podiumProbability).toBeGreaterThanOrEqual(0);
      expect(d.podiumProbability).toBeLessThanOrEqual(100);
      expect(d.top5Probability).toBeGreaterThanOrEqual(0);
      expect(d.top5Probability).toBeLessThanOrEqual(100);
    }
  });

  it("podium probability ≥ win probability for every driver", () => {
    for (const d of result.drivers) {
      expect(d.podiumProbability).toBeGreaterThanOrEqual(d.winProbability);
    }
  });

  it("top5 probability ≥ podium probability for every driver", () => {
    for (const d of result.drivers) {
      expect(d.top5Probability).toBeGreaterThanOrEqual(d.podiumProbability);
    }
  });
});

// ─── Statistical properties ──────────────────────────────────────────────────

describe("runProjections() — statistical properties", () => {
  const result = runProjections(STANDINGS_2, SCHEDULE_8, 3);

  it("total win probability across all drivers is close to 100%", () => {
    const total = result.drivers.reduce((s, d) => s + d.winProbability, 0);
    // Summing probabilities should be ~100%; allow ±5% for DNF-heavy simulations
    expect(total).toBeGreaterThan(95);
    expect(total).toBeLessThan(105);
  });

  it("leader with a 250-point cushion has higher win probability than chaser", () => {
    const ver = result.drivers.find((d) => d.driverId === "max")!;
    const lec = result.drivers.find((d) => d.driverId === "lec")!;
    expect(ver.winProbability).toBeGreaterThan(lec.winProbability);
  });

  it("drivers are sorted by win probability descending", () => {
    const probs = result.drivers.map((d) => d.winProbability);
    for (let i = 0; i < probs.length - 1; i++) {
      expect(probs[i]).toBeGreaterThanOrEqual(probs[i + 1]);
    }
  });

  it("projected median points are at least current points for the leader", () => {
    const ver = result.drivers.find((d) => d.driverId === "max")!;
    expect(ver.projectedPoints.p50).toBeGreaterThanOrEqual(ver.currentPoints);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe("runProjections() — edge cases", () => {
  it("handles zero remaining races (season already complete)", () => {
    // All 3 rounds completed, schedule only has 3 rounds
    const schedule3 = SCHEDULE_8.slice(0, 3);
    const result = runProjections(STANDINGS_2, schedule3, 3);
    expect(result.remainingRaces).toBe(0);
    // Points should stay unchanged
    const ver = result.drivers.find((d) => d.driverId === "max")!;
    expect(ver.projectedPoints.p10).toBe(ver.currentPoints);
    expect(ver.projectedPoints.p50).toBe(ver.currentPoints);
    expect(ver.projectedPoints.p90).toBe(ver.currentPoints);
  });

  it("handles a large grid (20 drivers)", () => {
    const bigStandings: DriverStanding[] = Array.from({ length: 20 }, (_, i) =>
      makeDriverStanding({
        position: String(i + 1),
        positionText: String(i + 1),
        points: String(100 - i * 4),
        Driver: makeDriver({ driverId: `d${i}`, code: `D${i < 10 ? "0" : ""}${i}`, givenName: "Driver", familyName: String(i) }),
        Constructors: [makeConstructor({ constructorId: "ferrari", name: "Ferrari" })],
      })
    );
    const result = runProjections(bigStandings, SCHEDULE_8, 3);
    expect(result.drivers).toHaveLength(20);
  });

  it("handles a sprint weekend in the remaining schedule", () => {
    const scheduleWithSprint: Race[] = [
      ...SCHEDULE_8.slice(0, 3),
      makeRace({ round: "4", Sprint: { date: "2026-04-01", time: "10:00:00Z" } }), // sprint weekend
      ...SCHEDULE_8.slice(4),
    ];
    const result = runProjections(STANDINGS_2, scheduleWithSprint, 3);
    // Sprint weekend should not cause errors
    expect(result.remainingRaces).toBe(5);
    expect(result.drivers).toHaveLength(2);
  });
});
