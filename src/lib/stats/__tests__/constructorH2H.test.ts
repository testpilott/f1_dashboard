import { describe, it, expect } from "vitest";
import { constructorHeadToHead } from "@/lib/stats/constructorH2H";
import type { Race } from "@/lib/types";

function mkRace(results: { constructorId: string; name: string; position: string; points: string; status?: string }[]): Race {
  return {
    season: "2025",
    round: "1",
    url: "",
    raceName: "Test GP",
    Circuit: { circuitId: "test", url: "", circuitName: "Test Circuit", Location: { lat: "0", long: "0", locality: "Test", country: "Test" } },
    date: "2025-03-30",
    Results: results.map((r) => ({
      number: "1",
      position: r.position,
      positionText: r.position,
      points: r.points,
      Driver: { driverId: r.constructorId + "_drv", code: "TST", givenName: "Test", familyName: "Driver", dateOfBirth: "", nationality: "", permanentNumber: "1", url: "" },
      Constructor: { constructorId: r.constructorId, name: r.name, nationality: "", url: "" },
      grid: "1",
      laps: "50",
      status: r.status ?? "Finished",
      Time: undefined,
      FastestLap: undefined,
    })),
  } as unknown as Race;
}

const ferrari = { constructorId: "ferrari", name: "Ferrari" };
const merc = { constructorId: "mercedes", name: "Mercedes" };

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
      mkRace([
        { ...ferrari, position: "1", points: "25" },
        { ...ferrari, position: "2", points: "18" },
        { ...merc, position: "3", points: "15" },
        { ...merc, position: "4", points: "12" },
      ]),
    ];
    const result = constructorHeadToHead(races, "ferrari", "mercedes");
    expect(result.a.wins).toBe(1);
    expect(result.a.podiums).toBe(2);
    expect(result.b.wins).toBe(0);
    expect(result.b.podiums).toBe(1);
  });

  it("counts 1-2 finish for a constructor", () => {
    const races = [
      mkRace([
        { ...ferrari, position: "1", points: "25" },
        { ...ferrari, position: "2", points: "18" },
        { ...merc, position: "3", points: "15" },
        { ...merc, position: "5", points: "10" },
      ]),
    ];
    const result = constructorHeadToHead(races, "ferrari", "mercedes");
    expect(result.a.oneTwos).toBe(1);
    expect(result.b.oneTwos).toBe(0);
  });

  it("tracks h2h race-ahead counts", () => {
    const races = [
      mkRace([{ ...ferrari, position: "1", points: "25" }, { ...merc, position: "2", points: "18" }]),
      mkRace([{ ...ferrari, position: "3", points: "15" }, { ...merc, position: "2", points: "18" }]),
      mkRace([{ ...ferrari, position: "2", points: "18" }, { ...merc, position: "4", points: "12" }]),
    ];
    const result = constructorHeadToHead(races, "ferrari", "mercedes");
    expect(result.racesCompared).toBe(3);
    expect(result.aheadA).toBe(2);
    expect(result.aheadB).toBe(1);
  });

  it("sums points across drivers for same constructor", () => {
    const races = [
      mkRace([
        { ...ferrari, position: "1", points: "25" },
        { ...ferrari, position: "3", points: "15" },
        { ...merc, position: "2", points: "18" },
        { ...merc, position: "4", points: "12" },
      ]),
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
