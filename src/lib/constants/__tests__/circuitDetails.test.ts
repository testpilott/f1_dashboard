import { describe, it, expect } from "vitest";
import {
  CIRCUIT_DETAILS,
  getCircuitDetails,
  getCircuitWikipediaUrl,
} from "@/lib/constants/circuitDetails";

describe("getCircuitDetails", () => {
  it("returns the curated payload for a known circuit", () => {
    const details = getCircuitDetails("spa");
    expect(details).not.toBeNull();
    expect(details?.lengthMeters).toBe(7004);
    expect(details?.turnCount).toBe(19);
    expect(details?.direction).toBe("clockwise");
    expect(details?.wikipediaSlug).toBe("Circuit_de_Spa-Francorchamps");
    expect(details?.notableHotspots.length).toBeGreaterThan(0);
  });

  it("returns null for an unknown circuit", () => {
    expect(getCircuitDetails("estoril")).toBeNull();
  });

  it("returns null for an empty key", () => {
    expect(getCircuitDetails("")).toBeNull();
  });
});

describe("getCircuitWikipediaUrl", () => {
  it("builds the URL for a known circuit", () => {
    expect(getCircuitWikipediaUrl("spa")).toBe(
      "https://en.wikipedia.org/wiki/Circuit_de_Spa-Francorchamps",
    );
  });

  it("preserves underscores and percent-encodes diacritics", () => {
    const url = getCircuitWikipediaUrl("interlagos");
    expect(url).toContain("/wiki/");
    // encodeURI preserves "%" literals that are already in the stored slug,
    // and underscores survive (which encodeURIComponent would have ruined).
    expect(url).toContain("_");
    expect(url).toMatch(/Aut%C3%B3dromo/);
  });

  it("returns null when the circuit is not curated", () => {
    expect(getCircuitWikipediaUrl("not_a_real_circuit")).toBeNull();
  });
});

describe("CIRCUIT_DETAILS — data-driven sanity checks", () => {
  const entries = Object.entries(CIRCUIT_DETAILS);

  it("contains at least one entry", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it.each(entries)("%s has valid physical and metadata fields", (id, details) => {
    expect(details.lengthMeters, `${id}: lengthMeters`).toBeGreaterThan(0);
    expect(details.turnCount, `${id}: turnCount`).toBeGreaterThan(0);
    expect(details.elevationGainMeters, `${id}: elevationGainMeters`).toBeGreaterThanOrEqual(0);
    expect(details.maxBankingDegrees, `${id}: maxBankingDegrees`).toBeGreaterThanOrEqual(0);
    expect(
      ["clockwise", "anticlockwise", "mixed"],
      `${id}: direction`,
    ).toContain(details.direction);
    expect(details.wikipediaSlug, `${id}: wikipediaSlug`).not.toBe("");
    // Slug should not contain raw spaces — Wikipedia uses underscores.
    expect(details.wikipediaSlug, `${id}: slug spaces`).not.toMatch(/ /);
  });

  it.each(entries)(
    "%s notable hotspots reference valid corners with short descriptions",
    (id, details) => {
      for (const hotspot of details.notableHotspots) {
        expect(
          Number.isInteger(hotspot.corner) && hotspot.corner > 0,
          `${id} hotspot ${hotspot.name}: corner is positive integer`,
        ).toBe(true);
        // Allow a small slop: chicanes occasionally count as multiple
        // Multiviewer corner numbers higher than fan-named "turn count".
        // 1.5× turnCount is a generous upper bound that still catches
        // typos like "corner: 87 on a 14-turn track".
        expect(
          hotspot.corner,
          `${id} hotspot ${hotspot.name}: corner within plausible range`,
        ).toBeLessThanOrEqual(Math.ceil(details.turnCount * 1.5));
        expect(hotspot.name, `${id} hotspot name`).not.toBe("");
        expect(
          hotspot.description.length,
          `${id} hotspot ${hotspot.name}: description ≤140 chars`,
        ).toBeLessThanOrEqual(140);
      }
    },
  );
});
