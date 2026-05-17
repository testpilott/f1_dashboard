import { describe, it, expect } from "vitest";
import { seasonHeadToHead } from "@/lib/stats/headToHead";
import type { Race } from "@/lib/types";

function mkRace(
  round: number,
  results: {
    driverId: string;
    position: number;
    grid: number;
    points: number;
    status?: string;
  }[],
): Race {
  return {
    round: String(round),
    Results: results.map((r) => ({
      position: String(r.position),
      grid: String(r.grid),
      points: String(r.points),
      status: r.status ?? "Finished",
      Driver: { driverId: r.driverId },
    })),
  } as unknown as Race;
}

const A = "hamilton";
const B = "russell";

describe("seasonHeadToHead — per-driver aggregation", () => {
  const races = [
    mkRace(1, [
      { driverId: A, position: 1, grid: 1, points: 25 },
      { driverId: B, position: 3, grid: 4, points: 15 },
    ]),
    mkRace(2, [
      { driverId: A, position: 20, grid: 2, points: 0, status: "Accident" },
      { driverId: B, position: 2, grid: 1, points: 18 },
    ]),
  ];

  it("sums points, wins, podiums, poles and DNFs", () => {
    const { a, b } = seasonHeadToHead(races, A, B);
    expect(a).toMatchObject({ races: 2, points: 25, wins: 1, podiums: 1, poles: 1, dnf: 1 });
    expect(a.bestFinish).toBe(1);
    expect(b).toMatchObject({ races: 2, points: 33, wins: 0, podiums: 2, poles: 1, dnf: 0 });
    expect(b.bestFinish).toBe(2);
  });

  it("avgFinish only counts classified finishes", () => {
    const { a } = seasonHeadToHead(races, A, B);
    expect(a.avgFinish).toBe(1); // race 2 was a DNF, excluded
  });
});

describe("seasonHeadToHead — head-to-head counts", () => {
  it("counts who finished and qualified ahead in shared races", () => {
    const races = [
      mkRace(1, [
        { driverId: A, position: 1, grid: 2, points: 25 },
        { driverId: B, position: 2, grid: 1, points: 18 },
      ]),
      mkRace(2, [
        { driverId: A, position: 5, grid: 5, points: 10 },
        { driverId: B, position: 3, grid: 3, points: 15 },
      ]),
    ];
    const h = seasonHeadToHead(races, A, B);
    expect(h.raceCompared).toBe(2);
    expect(h.raceAheadA).toBe(1); // race 1: P1 < P2
    expect(h.raceAheadB).toBe(1); // race 2: P3 < P5
    expect(h.qualiCompared).toBe(2);
    expect(h.qualiAheadA).toBe(0); // B started ahead both times (grid 1<2, 3<5)
    expect(h.qualiAheadB).toBe(2);
  });

  it("ignores races where only one driver participated", () => {
    const races = [
      mkRace(1, [{ driverId: A, position: 1, grid: 1, points: 25 }]),
      mkRace(2, [
        { driverId: A, position: 2, grid: 2, points: 18 },
        { driverId: B, position: 1, grid: 1, points: 25 },
      ]),
    ];
    const h = seasonHeadToHead(races, A, B);
    expect(h.raceCompared).toBe(1);
    expect(h.raceAheadB).toBe(1);
  });

  it("treats grid 0 (pit-lane start) as no clean grid slot", () => {
    const races = [
      mkRace(1, [
        { driverId: A, position: 4, grid: 0, points: 12 },
        { driverId: B, position: 5, grid: 6, points: 10 },
      ]),
    ];
    const h = seasonHeadToHead(races, A, B);
    expect(h.raceCompared).toBe(1);
    expect(h.qualiCompared).toBe(0);
  });
});

describe("seasonHeadToHead — guards", () => {
  it("returns zeroed stats for non-array input", () => {
    const h = seasonHeadToHead(undefined as unknown as Race[], A, B);
    expect(h.a.races).toBe(0);
    expect(h.raceCompared).toBe(0);
  });

  it("does not compare a driver with themselves", () => {
    const races = [
      mkRace(1, [{ driverId: A, position: 1, grid: 1, points: 25 }]),
    ];
    const h = seasonHeadToHead(races, A, A);
    expect(h.raceCompared).toBe(0);
  });
});
