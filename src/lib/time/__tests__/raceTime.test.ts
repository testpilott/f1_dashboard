import { describe, expect, it } from "vitest";
import { buildRaceStartTimes, formatInZone, lapTimeToMs, validateCircuitTimezone } from "@/lib/time/raceTime";

describe("lapTimeToMs", () => {
  it("parses m:ss.mmm format", () => {
    expect(lapTimeToMs("1:23.456")).toBe(83456);
    expect(lapTimeToMs("0:58.100")).toBe(58100);
  });

  it("returns NaN for malformed values", () => {
    expect(Number.isNaN(lapTimeToMs("bad"))).toBe(true);
    expect(Number.isNaN(lapTimeToMs("1:2.34"))).toBe(true);
  });
});

describe("formatInZone", () => {
  it("formats valid ISO in a timezone", () => {
    const result = formatInZone("2026-06-07T13:00:00Z", "Europe/Rome");
    expect(result).not.toBeNull();
  });

  it("returns null for invalid input", () => {
    expect(formatInZone("invalid", "Europe/Rome")).toBeNull();
  });
});

describe("buildRaceStartTimes", () => {
  it("returns venue/eastern times for valid input", () => {
    const out = buildRaceStartTimes("2026-09-06", "13:00:00Z", "monza");
    expect(out.venue).not.toBeNull();
    expect(out.eastern).not.toBeNull();
  });

  it("returns nulls when time is missing", () => {
    expect(buildRaceStartTimes("2026-09-06", null, "monza")).toEqual({ venue: null, eastern: null });
  });
});

describe("validateCircuitTimezone", () => {
  it("accepts known circuit", () => {
    expect(validateCircuitTimezone("monza")).toBe(true);
  });

  it("rejects unknown circuit", () => {
    expect(validateCircuitTimezone("fakecircuit")).toBe(false);
  });
});
