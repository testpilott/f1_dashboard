import { describe, it, expect } from "vitest";
import { calculateDriverForm } from "@/lib/stats/form";
import type { Race } from "@/lib/types";
import { makeRace, makeRaceResult } from "@/test/fixtures";

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
    expect(
      calculateDriverForm(
        [
          makeRace({
            round: "1",
            Results: [
              makeRaceResult({
                position: "1",
                points: "25",
                Driver: { driverId: ALO },
              }),
            ],
          }),
        ],
        "",
      ).races,
    ).toBe(0);
  });

  it("returns neutral for an unknown driver", () => {
    const races = [
      makeRace({
        round: "1",
        Results: [
          makeRaceResult({
            position: "1",
            points: "25",
            Driver: { driverId: "norris" },
          }),
        ],
      }),
    ];
    expect(calculateDriverForm(races, ALO)).toEqual({
      races: 0,
      avgPoints: 0,
      podiumRatio: 0,
      finishes: 0,
      trend: "flat",
    });
  });

  it("returns neutral when window <= 0", () => {
    const races = [
      makeRace({
        round: "1",
        Results: [
          makeRaceResult({
            position: "1",
            points: "25",
            Driver: { driverId: ALO },
          }),
        ],
      }),
    ];
    expect(calculateDriverForm(races, ALO, 0).races).toBe(0);
  });
});

describe("calculateDriverForm — aggregation", () => {
  it("averages points, counts podiums and finishes over the window", () => {
    const races = [
      makeRace({ round: "1", Results: [makeRaceResult({ position: "2", points: "18", Driver: { driverId: ALO } })] }),
      makeRace({ round: "2", Results: [makeRaceResult({ position: "1", points: "25", Driver: { driverId: ALO } })] }),
      makeRace({ round: "3", Results: [makeRaceResult({ position: "8", points: "4", Driver: { driverId: ALO } })] }),
    ];
    const f = calculateDriverForm(races, ALO);
    expect(f.races).toBe(3);
    expect(f.avgPoints).toBeCloseTo((18 + 25 + 4) / 3, 5);
    expect(f.podiumRatio).toBeCloseTo(2 / 3, 5);
    expect(f.finishes).toBe(3);
  });

  it("only counts the most recent `window` rounds, sorted by round", () => {
    const races = [
      makeRace({ round: "5", Results: [makeRaceResult({ position: "1", points: "25", Driver: { driverId: ALO } })] }),
      makeRace({ round: "1", Results: [makeRaceResult({ position: "20", points: "0", Driver: { driverId: ALO } })] }),
      makeRace({ round: "2", Results: [makeRaceResult({ position: "20", points: "0", Driver: { driverId: ALO } })] }),
      makeRace({ round: "3", Results: [makeRaceResult({ position: "20", points: "0", Driver: { driverId: ALO } })] }),
      makeRace({ round: "4", Results: [makeRaceResult({ position: "20", points: "0", Driver: { driverId: ALO } })] }),
      makeRace({ round: "6", Results: [makeRaceResult({ position: "1", points: "25", Driver: { driverId: ALO } })] }),
    ];
    // window=5 -> rounds 2,3,4,5,6 (round 1 dropped)
    const f = calculateDriverForm(races, ALO, 5);
    expect(f.races).toBe(5);
    expect(f.avgPoints).toBeCloseTo((0 + 0 + 25 + 0 + 25) / 5, 5);
  });

  it("skips races where the driver did not participate", () => {
    const races = [
      makeRace({ round: "1", Results: [makeRaceResult({ position: "3", points: "15", Driver: { driverId: ALO } })] }),
      makeRace({ round: "2", Results: [makeRaceResult({ position: "1", points: "25", Driver: { driverId: "norris" } })] }),
      makeRace({ round: "3", Results: [makeRaceResult({ position: "4", points: "12", Driver: { driverId: ALO } })] }),
    ];
    const f = calculateDriverForm(races, ALO);
    expect(f.races).toBe(2);
    expect(f.avgPoints).toBeCloseTo((15 + 12) / 2, 5);
  });

  it("treats DNF/retired as a non-finish and guards non-numeric points", () => {
    const races = [
      makeRace({
        round: "1",
        Results: [
          makeRaceResult({
            position: "19",
            points: "NaN",
            status: "Accident",
            Driver: { driverId: ALO },
          }),
        ],
      }),
      makeRace({
        round: "2",
        Results: [
          makeRaceResult({
            position: "12",
            points: "0",
            status: "+1 Lap",
            Driver: { driverId: ALO },
          }),
        ],
      }),
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
      makeRace({ round: "1", Results: [makeRaceResult({ position: "15", points: "0", Driver: { driverId: ALO } })] }),
      makeRace({ round: "2", Results: [makeRaceResult({ position: "14", points: "0", Driver: { driverId: ALO } })] }),
      makeRace({ round: "3", Results: [makeRaceResult({ position: "1", points: "25", Driver: { driverId: ALO } })] }),
      makeRace({ round: "4", Results: [makeRaceResult({ position: "2", points: "18", Driver: { driverId: ALO } })] }),
    ];
    expect(calculateDriverForm(races, ALO).trend).toBe("up");
  });

  it("is 'down' when later results underperform earlier ones", () => {
    const races = [
      makeRace({ round: "1", Results: [makeRaceResult({ position: "1", points: "25", Driver: { driverId: ALO } })] }),
      makeRace({ round: "2", Results: [makeRaceResult({ position: "2", points: "18", Driver: { driverId: ALO } })] }),
      makeRace({ round: "3", Results: [makeRaceResult({ position: "15", points: "0", Driver: { driverId: ALO } })] }),
      makeRace({ round: "4", Results: [makeRaceResult({ position: "14", points: "0", Driver: { driverId: ALO } })] }),
    ];
    expect(calculateDriverForm(races, ALO).trend).toBe("down");
  });

  it("is 'flat' for steady scoring", () => {
    const races = [
      makeRace({ round: "1", Results: [makeRaceResult({ position: "5", points: "10", Driver: { driverId: ALO } })] }),
      makeRace({ round: "2", Results: [makeRaceResult({ position: "5", points: "10", Driver: { driverId: ALO } })] }),
      makeRace({ round: "3", Results: [makeRaceResult({ position: "5", points: "10", Driver: { driverId: ALO } })] }),
      makeRace({ round: "4", Results: [makeRaceResult({ position: "5", points: "10", Driver: { driverId: ALO } })] }),
    ];
    expect(calculateDriverForm(races, ALO).trend).toBe("flat");
  });

  it("is 'flat' with a single race (insufficient data)", () => {
    expect(
      calculateDriverForm(
        [
          makeRace({
            round: "1",
            Results: [makeRaceResult({ position: "1", points: "25", Driver: { driverId: ALO } })],
          }),
        ],
        ALO,
      ).trend,
    ).toBe("flat");
  });
});
