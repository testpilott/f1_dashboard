import { describe, it, expect } from "vitest";
import { constructorHeadToHead } from "@/lib/stats/constructorH2H";
import type { Race } from "@/lib/types";
import { makeConstructor, makeDriver, makeRace, makeRaceResult } from "@/test/fixtures";

const ferrari = { constructorId: "ferrari", name: "Ferrari" };
const merc = { constructorId: "mercedes", name: "Mercedes" };

function teamResult(input: {
  constructorId: string;
  name: string;
  position: string;
  points: string;
  status?: string;
}) {
  return makeRaceResult({
    number: "1",
    position: input.position,
    positionText: input.position,
    points: input.points,
    Driver: makeDriver({ driverId: `${input.constructorId}_drv` }),
    Constructor: makeConstructor({ constructorId: input.constructorId, name: input.name }),
    grid: "1",
    laps: "50",
    status: input.status ?? "Finished",
  });
}

describe("constructorHeadToHead", () => {
  it("returns empty result for non-array input", () => {
    const result = constructorHeadToHead(null as unknown as Race[], "ferrari", "mercedes");
    expect(result.racesCompared).toBe(0);
    expect(result.aheadA).toBe(0);
  });

  it("returns empty result when constructor IDs missing", () => {
    const result = constructorHeadToHead([], "", "mercedes");
    expect(result.racesCompared).toBe(0);
  });

  it("counts wins and podiums correctly", () => {
    const races = [
      makeRace({
        Results: [
          teamResult({ ...ferrari, position: "1", points: "25" }),
          teamResult({ ...ferrari, position: "2", points: "18" }),
          teamResult({ ...merc, position: "3", points: "15" }),
          teamResult({ ...merc, position: "4", points: "12" }),
        ],
      }),
    ];
    const result = constructorHeadToHead(races, "ferrari", "mercedes");
    expect(result.a.wins).toBe(1);
    expect(result.a.podiums).toBe(2);
    expect(result.b.wins).toBe(0);
    expect(result.b.podiums).toBe(1);
  });

  it("counts 1-2 finish for a constructor", () => {
    const races = [
      makeRace({
        Results: [
          teamResult({ ...ferrari, position: "1", points: "25" }),
          teamResult({ ...ferrari, position: "2", points: "18" }),
          teamResult({ ...merc, position: "3", points: "15" }),
          teamResult({ ...merc, position: "5", points: "10" }),
        ],
      }),
    ];
    const result = constructorHeadToHead(races, "ferrari", "mercedes");
    expect(result.a.oneTwos).toBe(1);
    expect(result.b.oneTwos).toBe(0);
  });

  it("tracks h2h race-ahead counts", () => {
    const races = [
      makeRace({ Results: [teamResult({ ...ferrari, position: "1", points: "25" }), teamResult({ ...merc, position: "2", points: "18" })] }),
      makeRace({ Results: [teamResult({ ...ferrari, position: "3", points: "15" }), teamResult({ ...merc, position: "2", points: "18" })] }),
      makeRace({ Results: [teamResult({ ...ferrari, position: "2", points: "18" }), teamResult({ ...merc, position: "4", points: "12" })] }),
    ];
    const result = constructorHeadToHead(races, "ferrari", "mercedes");
    expect(result.racesCompared).toBe(3);
    expect(result.aheadA).toBe(2);
    expect(result.aheadB).toBe(1);
  });

  it("sums points across drivers for same constructor", () => {
    const races = [
      makeRace({
        Results: [
          teamResult({ ...ferrari, position: "1", points: "25" }),
          teamResult({ ...ferrari, position: "3", points: "15" }),
          teamResult({ ...merc, position: "2", points: "18" }),
          teamResult({ ...merc, position: "4", points: "12" }),
        ],
      }),
    ];
    const result = constructorHeadToHead(races, "ferrari", "mercedes");
    expect(result.a.totalPoints).toBe(40);
    expect(result.b.totalPoints).toBe(30);
  });

  it("handles empty race list gracefully", () => {
    const result = constructorHeadToHead([], "ferrari", "mercedes");
    expect(result.racesCompared).toBe(0);
    expect(result.a.wins).toBe(0);
  });
});
