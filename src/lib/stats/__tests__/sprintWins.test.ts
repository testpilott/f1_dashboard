import { describe, expect, it } from "vitest";
import { tallySprintWins } from "@/lib/stats/sprintWins";
import type { Race, SprintResult } from "@/lib/types";

function sprintRow(driverId: string, constructorId: string, position: string): SprintResult {
  return {
    number: "1",
    position,
    positionText: position,
    points: position === "1" ? "8" : "0",
    Driver: {
      driverId,
      permanentNumber: "1",
      code: driverId.slice(0, 3).toUpperCase(),
      url: "",
      givenName: driverId,
      familyName: driverId,
      dateOfBirth: "1990-01-01",
      nationality: "Unknown",
    },
    Constructor: {
      constructorId,
      url: "",
      name: constructorId,
      nationality: "Unknown",
    },
    grid: "1",
    laps: "24",
    status: "Finished",
  } as SprintResult;
}

function sprintRace(round: string, rows: SprintResult[]): Race {
  return {
    season: "2026",
    round,
    url: "",
    raceName: `Round ${round}`,
    Circuit: {
      circuitId: "spa",
      url: "",
      circuitName: "Spa",
      Location: { lat: "0", long: "0", locality: "Spa", country: "Belgium" },
    },
    date: "2026-05-01",
    SprintResults: rows,
  } as Race;
}

describe("tallySprintWins", () => {
  it("returns empty tallies for no races", () => {
    expect(tallySprintWins([])).toEqual({ drivers: {}, constructors: {} });
  });

  it("counts one win per sprint for the P1 driver and their constructor", () => {
    const tallies = tallySprintWins([
      sprintRace("1", [sprintRow("verstappen", "red_bull", "1"), sprintRow("norris", "mclaren", "2")]),
    ]);
    expect(tallies.drivers).toEqual({ verstappen: 1 });
    expect(tallies.constructors).toEqual({ red_bull: 1 });
  });

  it("accumulates wins across multiple sprint weekends", () => {
    const tallies = tallySprintWins([
      sprintRace("1", [sprintRow("verstappen", "red_bull", "1")]),
      sprintRace("5", [sprintRow("norris", "mclaren", "1")]),
      sprintRace("9", [sprintRow("verstappen", "red_bull", "1")]),
    ]);
    expect(tallies.drivers).toEqual({ verstappen: 2, norris: 1 });
    expect(tallies.constructors).toEqual({ red_bull: 2, mclaren: 1 });
  });

  it("ignores non-P1 finishers entirely", () => {
    const tallies = tallySprintWins([
      sprintRace("1", [
        sprintRow("verstappen", "red_bull", "1"),
        sprintRow("norris", "mclaren", "2"),
        sprintRow("piastri", "mclaren", "3"),
      ]),
    ]);
    expect(tallies.drivers.norris).toBeUndefined();
    expect(tallies.drivers.piastri).toBeUndefined();
    expect(tallies.constructors.mclaren).toBeUndefined();
  });

  it("skips races with missing or empty SprintResults", () => {
    const bare = { ...sprintRace("2", []), SprintResults: undefined } as Race;
    const tallies = tallySprintWins([bare, sprintRace("3", [])]);
    expect(tallies).toEqual({ drivers: {}, constructors: {} });
  });

  it("skips winner rows with missing Driver or Constructor identifiers", () => {
    const broken = sprintRace("4", [
      { ...sprintRow("ghost", "phantom", "1"), Driver: undefined, Constructor: undefined } as unknown as SprintResult,
    ]);
    expect(tallySprintWins([broken])).toEqual({ drivers: {}, constructors: {} });
  });
});
