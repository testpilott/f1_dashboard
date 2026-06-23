import { describe, it, expect } from "vitest";
import { buildIncidentMarkers, buildHotspotMarkers } from "@/lib/race/markers";
import type { CircuitCorner } from "@/components/race/TrackSVG";
import type { CircuitDetails } from "@/lib/constants/circuitDetails";

describe("buildIncidentMarkers", () => {
  it("returns [] for null / undefined / unavailable input", () => {
    expect(buildIncidentMarkers(null)).toEqual([]);
    expect(buildIncidentMarkers(undefined)).toEqual([]);
    expect(buildIncidentMarkers({ available: false })).toEqual([]);
    expect(buildIncidentMarkers({ available: true })).toEqual([]);
  });

  it("drops incidents missing a track coordinate", () => {
    const markers = buildIncidentMarkers({
      available: true,
      incidents: [
        {
          x: null,
          y: 5,
          lap_number: 1,
          driver_number: 44,
          flag: "YELLOW",
          category: "Flag",
          message: "y but no x",
        },
        {
          x: 10,
          y: null,
          lap_number: 2,
          driver_number: 1,
          flag: null,
          category: "CarEvent",
          message: "x but no y",
        },
        {
          x: 50,
          y: 50,
          lap_number: 3,
          driver_number: 4,
          flag: null,
          category: "CarEvent",
          message: "good row",
        },
      ],
    });
    expect(markers).toHaveLength(1);
    expect(markers[0].meta.message).toBe("good row");
    expect(markers[0].meta.type).toBe("incident");
  });

  it("preserves all meta fields including the type discriminator", () => {
    const markers = buildIncidentMarkers({
      available: true,
      incidents: [
        {
          x: 10,
          y: 20,
          lap_number: 12,
          driver_number: 16,
          flag: "RED",
          category: "Flag",
          message: "Red flag — debris",
        },
      ],
    });
    expect(markers[0]).toEqual({
      x: 10,
      y: 20,
      meta: {
        lap_number: 12,
        driver_number: 16,
        flag: "RED",
        category: "Flag",
        message: "Red flag — debris",
        type: "incident",
      },
    });
  });
});

const corners: CircuitCorner[] = [
  { number: 3, x: 30, y: 30, length: 100 },
  { number: 8, x: 60, y: 60, length: 500 },
];

const detailsWith = (hotspots: CircuitDetails["notableHotspots"]): CircuitDetails => ({
  lengthMeters: 7000,
  turnCount: 20,
  elevationGainMeters: 100,
  maxBankingDegrees: 0,
  direction: "clockwise",
  wikipediaSlug: "Test",
  notableHotspots: hotspots,
});

describe("buildHotspotMarkers", () => {
  it("returns [] when details or corners are missing or empty", () => {
    expect(buildHotspotMarkers(undefined, corners)).toEqual([]);
    expect(buildHotspotMarkers(detailsWith([]), corners)).toEqual([]);
    expect(buildHotspotMarkers(detailsWith([{ corner: 3, name: "n", description: "d" }]), [])).toEqual([]);
    expect(buildHotspotMarkers(detailsWith([{ corner: 3, name: "n", description: "d" }]), undefined)).toEqual([]);
  });

  it("joins hotspots to corner geometry by corner.number", () => {
    const markers = buildHotspotMarkers(
      detailsWith([
        { corner: 3, name: "Eau Rouge", description: "Iconic." },
        { corner: 8, name: "Les Combes", description: "Braking." },
      ]),
      corners,
    );
    expect(markers).toHaveLength(2);
    expect(markers[0]).toEqual({
      x: 30,
      y: 30,
      meta: {
        lap_number: null,
        driver_number: null,
        flag: null,
        category: "Hotspot",
        message: "Iconic.",
        type: "hotspot",
        name: "Eau Rouge",
        description: "Iconic.",
      },
    });
  });

  it("silently drops hotspots whose corner number isn't in the geometry", () => {
    const markers = buildHotspotMarkers(
      detailsWith([
        { corner: 3, name: "Real", description: "ok" },
        { corner: 99, name: "Phantom", description: "missing in geometry" },
      ]),
      corners,
    );
    expect(markers).toHaveLength(1);
    expect(markers[0].meta.name).toBe("Real");
  });
});
