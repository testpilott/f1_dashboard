import { describe, it, expect } from "vitest";
import {
  buildSectorMap,
  buildSectorGroups,
  toggleSectorSelection,
  toggleOneCorner,
} from "@/lib/race/sectors";
import type { CircuitCorner, SectorId } from "@/components/race/TrackSVG";

const SECTORS = [
  { id: 1 as SectorId, label: "S1" },
  { id: 2 as SectorId, label: "S2" },
  { id: 3 as SectorId, label: "S3" },
];

// Three corners covering the three sectors via cumulative length.
// getSectorId classifies by length-fraction of the total — these
// fixtures avoid coupling to its exact thresholds by spanning a wide
// range and just verifying the map shape.
const corners: CircuitCorner[] = [
  { number: 1, x: 0, y: 0, length: 10 },
  { number: 2, x: 1, y: 1, length: 200 },
  { number: 3, x: 2, y: 2, length: 500 },
];

describe("buildSectorMap", () => {
  it("returns an empty Map for no corners", () => {
    expect(buildSectorMap([]).size).toBe(0);
    expect(buildSectorMap(undefined).size).toBe(0);
  });

  it("returns one entry per corner, all keyed by corner number", () => {
    const m = buildSectorMap(corners);
    expect(m.size).toBe(3);
    expect(m.has(1)).toBe(true);
    expect(m.has(2)).toBe(true);
    expect(m.has(3)).toBe(true);
  });
});

describe("buildSectorGroups", () => {
  const sectorMap = new Map<number, SectorId>([
    [1, 1],
    [2, 2],
    [3, 3],
  ]);

  it("returns one group per sector containing only that sector's corners", () => {
    const groups = buildSectorGroups(SECTORS, corners, sectorMap, new Set());
    expect(groups).toHaveLength(3);
    expect(groups[0].corners.map((c) => c.number)).toEqual([1]);
    expect(groups[1].corners.map((c) => c.number)).toEqual([2]);
    expect(groups[2].corners.map((c) => c.number)).toEqual([3]);
  });

  it("marks allSelected only when every corner in the sector is selected and there is at least one", () => {
    const groups = buildSectorGroups(SECTORS, corners, sectorMap, new Set([1]));
    expect(groups[0].allSelected).toBe(true);
    expect(groups[1].allSelected).toBe(false);
    expect(groups[2].allSelected).toBe(false);
  });

  it("never marks an empty sector as allSelected (regression guard)", () => {
    // Only corner #1 in the geometry, mapped to sector 1; sector 2 and 3 are empty.
    const onlyOne = [corners[0]];
    const oneSectorMap = new Map<number, SectorId>([[1, 1]]);
    const groups = buildSectorGroups(SECTORS, onlyOne, oneSectorMap, new Set());
    expect(groups[1].corners).toHaveLength(0);
    expect(groups[1].allSelected).toBe(false);
  });
});

describe("toggleSectorSelection", () => {
  const sectorMap = new Map<number, SectorId>([
    [1, 1],
    [2, 1],
    [3, 2],
  ]);
  const cornersHere: CircuitCorner[] = [
    { number: 1, x: 0, y: 0, length: 10 },
    { number: 2, x: 1, y: 1, length: 20 },
    { number: 3, x: 2, y: 2, length: 30 },
  ];

  it("adds every corner in the sector when the sector is not fully selected", () => {
    const next = toggleSectorSelection(new Set(), 1, cornersHere, sectorMap);
    expect([...next].sort()).toEqual([1, 2]);
  });

  it("removes every corner in the sector when it is fully selected", () => {
    const next = toggleSectorSelection(
      new Set([1, 2, 3]),
      1,
      cornersHere,
      sectorMap,
    );
    expect([...next]).toEqual([3]); // sector-1 corners gone; sector-2 (corner 3) untouched
  });

  it("does not mutate the input set", () => {
    const prev = new Set([3]);
    toggleSectorSelection(prev, 1, cornersHere, sectorMap);
    expect([...prev]).toEqual([3]);
  });
});

describe("toggleOneCorner", () => {
  it("adds a missing corner", () => {
    expect([...toggleOneCorner(new Set([1]), 2)]).toEqual([1, 2]);
  });
  it("removes a present corner", () => {
    expect([...toggleOneCorner(new Set([1, 2]), 1)]).toEqual([2]);
  });
  it("does not mutate the input set", () => {
    const prev = new Set([1, 2]);
    toggleOneCorner(prev, 1);
    expect([...prev]).toEqual([1, 2]);
  });
});
