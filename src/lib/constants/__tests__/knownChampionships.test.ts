import { describe, expect, it } from "vitest";
import {
  KNOWN_CHAMPIONSHIPS,
  getKnownChampionshipFloor,
} from "@/lib/constants/knownChampionships";

describe("knownChampionships", () => {
  it("records the correct title count for landmark modern champions", () => {
    expect(KNOWN_CHAMPIONSHIPS.hamilton).toBe(7);
    expect(KNOWN_CHAMPIONSHIPS.michael_schumacher).toBe(7);
    expect(KNOWN_CHAMPIONSHIPS.max_verstappen).toBe(4);
    expect(KNOWN_CHAMPIONSHIPS.vettel).toBe(4);
    expect(KNOWN_CHAMPIONSHIPS.alonso).toBe(2);
    expect(KNOWN_CHAMPIONSHIPS.norris).toBe(1);
    expect(KNOWN_CHAMPIONSHIPS.rosberg).toBe(1);
  });

  it("returns 0 for drivers not on the closed champions list", () => {
    expect(getKnownChampionshipFloor("russell")).toBe(0);
    expect(getKnownChampionshipFloor("sainz")).toBe(0);
    expect(getKnownChampionshipFloor("totally_unknown_driver")).toBe(0);
  });

  it("returns the recorded count for known champions", () => {
    expect(getKnownChampionshipFloor("hamilton")).toBe(7);
    expect(getKnownChampionshipFloor("max_verstappen")).toBe(4);
    expect(getKnownChampionshipFloor("norris")).toBe(1);
  });

  it("contains only positive integer counts", () => {
    for (const [driverId, count] of Object.entries(KNOWN_CHAMPIONSHIPS)) {
      expect(Number.isInteger(count), `${driverId} count must be integer`).toBe(true);
      expect(count, `${driverId} count must be >= 1`).toBeGreaterThanOrEqual(1);
    }
  });
});
