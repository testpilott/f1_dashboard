import { describe, it, expect } from "vitest";
import { calculateDriverForm } from "@/lib/stats/form";
import type { Race } from "@/lib/types";

/** Build a minimal Race carrying just the fields calculateDriverForm reads. */
function mkRace(
  round: number,
  results: { driverId: string; position: number; points: number; status?: string }[],
): Race {
  return {
    round: String(round),
    Results: results.map((r) => ({
      position: String(r.position),
      points: String(r.points),
      status: r.status ?? "Finished",
      Driver: { driverId: r.driverId },
    })),
  } as unknown as Race;
}

const ALO = "alonso";

describe("calculateDriverForm — guards", () => {
  it("returns a neutral result for empty input", () => {
    expect(calculateDriverForm([], ALO)).toEqual({
      races: 0,
      avgPoints: 0,
      podiumRatio: 0,
      finishes: 0,
      trend: "flat",
    });
  });

  it("returns neutral when the input is not an array", () => {
    expect(calculateDriverForm(undefined as unknown as Race[], ALO).races).toBe(0);
  });

  it("returns neutral for an empty driverId", () => {
    expect(calculateDriverForm([mkRace(1, [{ driverId: ALO, position: 1, points: 25 }])], "")
      .races).toBe(0);
  });

  it("returns neutral for an unknown driver", () => {
    const races = [mkRace(1, [{ driverId: "norris", position: 1, points: 25 }])];
    expect(calculateDriverForm(races, ALO)).toEqual({
      races: 0,
      avgPoints: 0,
      podiumRatio: 0,
      finishes: 0,
      trend: "flat",
    });
  });

  it("returns neutral when window <= 0", () => {
    const races = [mkRace(1, [{ driverId: ALO, position: 1, points: 25 }])];
    expect(calculateDriverForm(races, ALO, 0).races).toBe(0);
  });
});

describe("calculateDriverForm — aggregation", () => {
  it("averages points, counts podiums and finishes over the window", () => {
    const races = [
      mkRace(1, [{ driverId: ALO, position: 2, points: 18 }]),
      mkRace(2, [{ driverId: ALO, position: 1, points: 25 }]),
      mkRace(3, [{ driverId: ALO, position: 8, points: 4 }]),
    ];
    const f = calculateDriverForm(races, ALO);
    expect(f.races).toBe(3);
    expect(f.avgPoints).toBeCloseTo((18 + 25 + 4) / 3, 5);
    expect(f.podiumRatio).toBeCloseTo(2 / 3, 5);
    expect(f.finishes).toBe(3);
  });

  it("only counts the most recent `window` rounds, sorted by round", () => {
    const races = [
      mkRace(5, [{ driverId: ALO, position: 1, points: 25 }]),
      mkRace(1, [{ driverId: ALO, position: 20, points: 0 }]),
      mkRace(2, [{ driverId: ALO, position: 20, points: 0 }]),
      mkRace(3, [{ driverId: ALO, position: 20, points: 0 }]),
      mkRace(4, [{ driverId: ALO, position: 20, points: 0 }]),
      mkRace(6, [{ driverId: ALO, position: 1, points: 25 }]),
    ];
    // window=5 -> rounds 2,3,4,5,6 (round 1 dropped)
    const f = calculateDriverForm(races, ALO, 5);
    expect(f.races).toBe(5);
    expect(f.avgPoints).toBeCloseTo((0 + 0 + 25 + 0 + 25) / 5, 5);
  });

  it("skips races where the driver did not participate", () => {
    const races = [
      mkRace(1, [{ driverId: ALO, position: 3, points: 15 }]),
      mkRace(2, [{ driverId: "norris", position: 1, points: 25 }]),
      mkRace(3, [{ driverId: ALO, position: 4, points: 12 }]),
    ];
    const f = calculateDriverForm(races, ALO);
    expect(f.races).toBe(2);
    expect(f.avgPoints).toBeCloseTo((15 + 12) / 2, 5);
  });

  it("treats DNF/retired as a non-finish and guards non-numeric points", () => {
    const races = [
      mkRace(1, [{ driverId: ALO, position: 19, points: NaN as unknown as number, status: "Accident" }]),
      mkRace(2, [{ driverId: ALO, position: 12, points: 0, status: "+1 Lap" }]),
    ];
    const f = calculateDriverForm(races, ALO);
    expect(f.races).toBe(2);
    expect(f.avgPoints).toBe(0);
    expect(f.finishes).toBe(1); // only the "+1 Lap" race
    expect(f.podiumRatio).toBe(0);
  });
});

describe("calculateDriverForm — trend", () => {
  it("is 'up' when later results outscore earlier ones", () => {
    const races = [
      mkRace(1, [{ driverId: ALO, position: 15, points: 0 }]),
      mkRace(2, [{ driverId: ALO, position: 14, points: 0 }]),
      mkRace(3, [{ driverId: ALO, position: 1, points: 25 }]),
      mkRace(4, [{ driverId: ALO, position: 2, points: 18 }]),
    ];
    expect(calculateDriverForm(races, ALO).trend).toBe("up");
  });

  it("is 'down' when later results underperform earlier ones", () => {
    const races = [
      mkRace(1, [{ driverId: ALO, position: 1, points: 25 }]),
      mkRace(2, [{ driverId: ALO, position: 2, points: 18 }]),
      mkRace(3, [{ driverId: ALO, position: 15, points: 0 }]),
      mkRace(4, [{ driverId: ALO, position: 14, points: 0 }]),
    ];
    expect(calculateDriverForm(races, ALO).trend).toBe("down");
  });

  it("is 'flat' for steady scoring", () => {
    const races = [
      mkRace(1, [{ driverId: ALO, position: 5, points: 10 }]),
      mkRace(2, [{ driverId: ALO, position: 5, points: 10 }]),
      mkRace(3, [{ driverId: ALO, position: 5, points: 10 }]),
      mkRace(4, [{ driverId: ALO, position: 5, points: 10 }]),
    ];
    expect(calculateDriverForm(races, ALO).trend).toBe("flat");
  });

  it("is 'flat' with a single race (insufficient data)", () => {
    expect(
      calculateDriverForm([mkRace(1, [{ driverId: ALO, position: 1, points: 25 }])], ALO).trend,
    ).toBe("flat");
  });
});
