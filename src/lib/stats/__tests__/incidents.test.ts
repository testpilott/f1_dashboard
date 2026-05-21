import { describe, it, expect } from "vitest";
import {
  classifyIncidents,
  closestByTime,
  nearestPolylinePoint,
  parseCornerNumber,
} from "../incidents";
import type { OpenF1RaceControl, OpenF1Location } from "@/lib/types";

// ─── classifyIncidents ────────────────────────────────────────────────────────

const baseControl = (overrides: Partial<OpenF1RaceControl>): OpenF1RaceControl => ({
  session_key: 7953,
  meeting_key: 1219,
  date: "2023-03-05T15:00:00Z",
  category: "CarEvent",
  flag: null,
  scope: null,
  sector: null,
  driver_number: 1,
  lap_number: 10,
  message: "CAR 1 OFF TRACK AND CONTINUED AT TURN 5",
  ...overrides,
});

describe("classifyIncidents", () => {
  it("keeps a CarEvent entry with a driver_number", () => {
    const entry = baseControl({ category: "CarEvent", driver_number: 63 });
    expect(classifyIncidents([entry])).toHaveLength(1);
  });

  it("drops a CarEvent with no driver_number", () => {
    const entry = baseControl({ category: "CarEvent", driver_number: null });
    expect(classifyIncidents([entry])).toHaveLength(0);
  });

  it("drops a DRS entry", () => {
    const entry = baseControl({ category: "Drs", driver_number: null, flag: null });
    expect(classifyIncidents([entry])).toHaveLength(0);
  });

  it("drops Flag CLEAR", () => {
    const entry = baseControl({ category: "Flag", flag: "CLEAR", driver_number: null });
    expect(classifyIncidents([entry])).toHaveLength(0);
  });

  it("drops Flag BLUE (blue flag for backmarker)", () => {
    const entry = baseControl({ category: "Flag", flag: "BLUE", driver_number: 31 });
    expect(classifyIncidents([entry])).toHaveLength(0);
  });

  it("drops Other and SessionStatus entries", () => {
    const other = baseControl({ category: "Other", driver_number: null });
    const status = baseControl({ category: "SessionStatus", driver_number: null });
    expect(classifyIncidents([other, status])).toHaveLength(0);
  });

  it("keeps Flag YELLOW with driver_number", () => {
    const entry = baseControl({ category: "Flag", flag: "YELLOW", driver_number: 16 });
    expect(classifyIncidents([entry])).toHaveLength(1);
  });

  it("drops Flag YELLOW without driver_number", () => {
    const entry = baseControl({ category: "Flag", flag: "YELLOW", driver_number: null });
    expect(classifyIncidents([entry])).toHaveLength(0);
  });

  it("keeps Flag DOUBLE YELLOW with driver_number", () => {
    const entry = baseControl({ category: "Flag", flag: "DOUBLE YELLOW", driver_number: 4 });
    expect(classifyIncidents([entry])).toHaveLength(1);
  });

  it("keeps Flag RED with driver_number", () => {
    const entry = baseControl({ category: "Flag", flag: "RED", driver_number: 44 });
    expect(classifyIncidents([entry])).toHaveLength(1);
  });

  it("is case-insensitive for flag strings", () => {
    const entry = baseControl({ category: "Flag", flag: "yellow", driver_number: 55 });
    expect(classifyIncidents([entry])).toHaveLength(1);
  });
});

// ─── closestByTime ────────────────────────────────────────────────────────────

const location = (overrides: Partial<OpenF1Location>): OpenF1Location => ({
  session_key: 7953,
  meeting_key: 1219,
  driver_number: 1,
  date: "2023-03-05T15:00:00.000Z",
  x: 0,
  y: 0,
  z: 0,
  ...overrides,
});

describe("closestByTime", () => {
  it("returns null for empty array", () => {
    expect(closestByTime([], "2023-03-05T15:00:00Z")).toBeNull();
  });

  it("picks the nearest sample", () => {
    const samples = [
      location({ date: "2023-03-05T15:00:00.000Z", x: 10 }),
      location({ date: "2023-03-05T15:00:00.200Z", x: 20 }),
      location({ date: "2023-03-05T15:00:00.500Z", x: 30 }),
    ];
    // Target is closest to the 200ms sample
    const result = closestByTime(samples, "2023-03-05T15:00:00.250Z");
    expect(result?.x).toBe(20);
  });

  it("returns the only element for a single-element array", () => {
    const samples = [location({ x: 42 })];
    expect(closestByTime(samples, "2023-03-05T20:00:00Z")?.x).toBe(42);
  });
});

// ─── nearestPolylinePoint ─────────────────────────────────────────────────────

describe("nearestPolylinePoint", () => {
  it("returns the input coords for an empty array", () => {
    expect(nearestPolylinePoint([], [], 5, 5)).toEqual({ x: 5, y: 5 });
  });

  it("returns the nearest vertex on a unit-square polyline", () => {
    // Square: (0,0), (1,0), (1,1), (0,1)
    const xs = [0, 1, 1, 0];
    const ys = [0, 0, 1, 1];
    expect(nearestPolylinePoint(xs, ys, 0.1, 0.05)).toEqual({ x: 0, y: 0 });
    expect(nearestPolylinePoint(xs, ys, 0.9, 0.95)).toEqual({ x: 1, y: 1 });
    expect(nearestPolylinePoint(xs, ys, 0.05, 0.9)).toEqual({ x: 0, y: 1 });
  });
});

// ─── parseCornerNumber ────────────────────────────────────────────────────────

describe("parseCornerNumber", () => {
  it("extracts turn number from standard message", () => {
    expect(parseCornerNumber("CAR 1 OFF TRACK AND CONTINUED AT TURN 4")).toBe(4);
  });

  it("handles multi-digit turn numbers", () => {
    expect(parseCornerNumber("INCIDENT AT TURN 13 UNDER INVESTIGATION")).toBe(13);
  });

  it("is case-insensitive", () => {
    expect(parseCornerNumber("car 14 contact at turn 2")).toBe(2);
  });

  it("returns null when no turn is mentioned", () => {
    expect(parseCornerNumber("SAFETY CAR DEPLOYED")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseCornerNumber("")).toBeNull();
  });
});
