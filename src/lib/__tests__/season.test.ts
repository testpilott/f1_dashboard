import { describe, expect, it } from "vitest";
import { normalizeSeason, isValidSeasonParam, seasonLabel, SEASON_OPTIONS } from "@/lib/season";

describe("normalizeSeason", () => {
  it("returns 'current' for null", () => {
    expect(normalizeSeason(null)).toBe("current");
  });

  it("returns 'current' for '2026' (current year)", () => {
    expect(normalizeSeason("2026")).toBe("current");
  });

  it("returns 'current' for literal 'current'", () => {
    expect(normalizeSeason("current")).toBe("current");
  });

  it("returns the year string for valid historical years", () => {
    expect(normalizeSeason("2023")).toBe("2023");
    expect(normalizeSeason("2020")).toBe("2020");
    expect(normalizeSeason("1950")).toBe("1950");
  });

  it("returns 'current' for invalid string", () => {
    expect(normalizeSeason("abcd")).toBe("current");
    expect(normalizeSeason("")).toBe("current");
  });

  it("returns 'current' for year out of range", () => {
    expect(normalizeSeason("1899")).toBe("current");
    expect(normalizeSeason("2099")).toBe("current");
  });

  it("returns 'current' for injection attempts", () => {
    expect(normalizeSeason("2023 OR 1=1")).toBe("current");
    expect(normalizeSeason("'; DROP TABLE--")).toBe("current");
  });
});

describe("isValidSeasonParam", () => {
  it("accepts 'current'", () => {
    expect(isValidSeasonParam("current")).toBe(true);
  });

  it("accepts valid 4-digit years in range", () => {
    expect(isValidSeasonParam("2023")).toBe(true);
    expect(isValidSeasonParam("1950")).toBe(true);
    expect(isValidSeasonParam("2026")).toBe(true);
  });

  it("rejects non-4-digit strings", () => {
    expect(isValidSeasonParam("abcd")).toBe(false);
    expect(isValidSeasonParam("")).toBe(false);
    expect(isValidSeasonParam("202")).toBe(false);
    expect(isValidSeasonParam("20234")).toBe(false);
  });

  it("rejects years out of range", () => {
    expect(isValidSeasonParam("1899")).toBe(false);
    expect(isValidSeasonParam("2099")).toBe(false);
  });
});

describe("seasonLabel", () => {
  it("returns year + '(current)' for 'current'", () => {
    expect(seasonLabel("current")).toBe("2026 (current)");
  });

  it("returns year + '(current)' for '2026'", () => {
    expect(seasonLabel("2026")).toBe("2026 (current)");
  });

  it("returns the year as-is for historical years", () => {
    expect(seasonLabel("2023")).toBe("2023");
    expect(seasonLabel("2020")).toBe("2020");
  });
});

describe("SEASON_OPTIONS", () => {
  it("starts with the current year", () => {
    expect(SEASON_OPTIONS[0]).toBe("2026");
  });

  it("contains 2023", () => {
    expect(SEASON_OPTIONS).toContain("2023");
  });

  it("contains 1950", () => {
    expect(SEASON_OPTIONS).toContain("1950");
  });

  it("is sorted descending", () => {
    expect(Number(SEASON_OPTIONS[0])).toBeGreaterThan(Number(SEASON_OPTIONS[1]));
  });
});
