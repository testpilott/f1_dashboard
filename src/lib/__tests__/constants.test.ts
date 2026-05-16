import { describe, it, expect } from "vitest";
import {
  TEAM_COLORS,
  TEAM_LOGOS,
  getTeamColor,
  getTeamLogo,
  getFlag,
  getStatusLabel,
  getStatusTooltip,
  getWeatherLabel,
  getSegmentColor,
  POINTS_SYSTEM,
  SPRINT_POINTS_SYSTEM,
  FASTEST_LAP_POINT,
} from "@/lib/constants";

// ─── getTeamColor ─────────────────────────────────────────────────────────────

describe("getTeamColor()", () => {
  it("returns the correct colour for a known team", () => {
    expect(getTeamColor("Ferrari")).toBe("#E8002D");
    expect(getTeamColor("McLaren")).toBe("#FF8000");
    expect(getTeamColor("Mercedes")).toBe("#00D2BE");
    expect(getTeamColor("Red Bull")).toBe("#3671C6");
  });

  it("handles aliased team names", () => {
    expect(getTeamColor("Red Bull Racing")).toBe(TEAM_COLORS["Red Bull Racing"]);
    expect(getTeamColor("Alpine F1 Team")).toBe(TEAM_COLORS["Alpine F1 Team"]);
  });

  it("returns the default colour for an unknown team", () => {
    expect(getTeamColor("Unknown Team XYZ")).toBe("#6B7280");
    expect(getTeamColor("")).toBe("#6B7280");
  });
});

// ─── getTeamLogo ──────────────────────────────────────────────────────────────

describe("getTeamLogo()", () => {
  it("returns a /logos/*.webp path for a known team", () => {
    const logo = getTeamLogo("Ferrari");
    expect(logo).toBe("/logos/ferrari.webp");
  });

  it("returns a path for a full constructor name", () => {
    expect(getTeamLogo("McLaren F1 Team")).toBe("/logos/mclaren.webp");
  });

  it("returns undefined for an unknown team", () => {
    expect(getTeamLogo("Ghost Team")).toBeUndefined();
  });

  it("every logo path starts with /logos/ and ends with .webp", () => {
    Object.values(TEAM_LOGOS).forEach((logoPath) => {
      expect(logoPath).toMatch(/^\/logos\/.+\.webp$/);
    });
  });
});

// ─── getFlag ──────────────────────────────────────────────────────────────────

describe("getFlag()", () => {
  it("returns the correct emoji for known countries", () => {
    expect(getFlag("Australia")).toBe("🇦🇺");
    expect(getFlag("Italy")).toBe("🇮🇹");
    expect(getFlag("Monaco")).toBe("🇲🇨");
    expect(getFlag("Great Britain")).toBe("🇬🇧");
    expect(getFlag("United States")).toBe("🇺🇸");
    expect(getFlag("Las Vegas")).toBe("🇺🇸");
  });

  it("returns the chequered flag 🏁 for unknown countries", () => {
    expect(getFlag("Narnia")).toBe("🏁");
    expect(getFlag("")).toBe("🏁");
  });
});

// ─── getStatusLabel ───────────────────────────────────────────────────────────

describe("getStatusLabel()", () => {
  it("maps known status codes to short labels", () => {
    expect(getStatusLabel("R")).toBe("DNF");
    expect(getStatusLabel("D")).toBe("DSQ");
    expect(getStatusLabel("E")).toBe("EXC");
    expect(getStatusLabel("W")).toBe("WD");
    expect(getStatusLabel("F")).toBe("DNQ");
    expect(getStatusLabel("N")).toBe("NC");
  });

  it("returns the input unchanged for unknown codes", () => {
    expect(getStatusLabel("Z")).toBe("Z");
    expect(getStatusLabel("")).toBe("");
  });
});

// ─── getStatusTooltip ────────────────────────────────────────────────────────

describe("getStatusTooltip()", () => {
  it("returns the full description for known codes", () => {
    expect(getStatusTooltip("R")).toBe("Did Not Finish");
    expect(getStatusTooltip("D")).toBe("Disqualified");
    expect(getStatusTooltip("E")).toBe("Excluded");
    expect(getStatusTooltip("W")).toBe("Withdrew");
    expect(getStatusTooltip("F")).toBe("Did Not Qualify");
    expect(getStatusTooltip("N")).toBe("Not Classified");
  });

  it("returns the input unchanged for unknown codes", () => {
    expect(getStatusTooltip("X")).toBe("X");
  });
});

// ─── getWeatherLabel ─────────────────────────────────────────────────────────

describe("getWeatherLabel()", () => {
  it("returns 'Clear sky' for code 0", () => {
    expect(getWeatherLabel(0)).toBe("Clear sky");
  });

  it("returns 'Mainly clear' for codes 1–2", () => {
    expect(getWeatherLabel(1)).toBe("Mainly clear");
    expect(getWeatherLabel(2)).toBe("Mainly clear");
  });

  it("returns 'Overcast' for code 3", () => {
    expect(getWeatherLabel(3)).toBe("Overcast");
  });

  it("returns 'Rain' for codes 61–67", () => {
    expect(getWeatherLabel(61)).toBe("Rain");
    expect(getWeatherLabel(67)).toBe("Rain");
  });

  it("returns 'Rain showers' for codes 80–82", () => {
    expect(getWeatherLabel(80)).toBe("Rain showers");
    expect(getWeatherLabel(82)).toBe("Rain showers");
  });
});

// ─── getSegmentColor ─────────────────────────────────────────────────────────

describe("getSegmentColor()", () => {
  it("returns 'white' for code 2048 (no data)", () => {
    expect(getSegmentColor(2048)).toBe("white");
  });

  it("returns 'green' for code 2049 (personal best)", () => {
    expect(getSegmentColor(2049)).toBe("green");
  });

  it("returns 'purple' for code 2051 (overall best)", () => {
    expect(getSegmentColor(2051)).toBe("purple");
  });

  it("returns 'pitlane' for code 2064", () => {
    expect(getSegmentColor(2064)).toBe("pitlane");
  });

  it("returns 'yellow' as the default for unknown codes", () => {
    expect(getSegmentColor(0)).toBe("yellow");
    expect(getSegmentColor(9999)).toBe("yellow");
  });
});

// ─── Points systems ───────────────────────────────────────────────────────────

describe("POINTS_SYSTEM", () => {
  it("awards 25 points for P1 and 1 point for P10", () => {
    expect(POINTS_SYSTEM[0]).toBe(25);
    expect(POINTS_SYSTEM[9]).toBe(1);
  });

  it("awards 0 points outside the top 10", () => {
    expect(POINTS_SYSTEM[10]).toBe(0);
  });

  it("has 20 entries (enough for a full F1 grid)", () => {
    expect(POINTS_SYSTEM).toHaveLength(20);
  });
});

describe("SPRINT_POINTS_SYSTEM", () => {
  it("awards 8 points for P1", () => {
    expect(SPRINT_POINTS_SYSTEM[0]).toBe(8);
  });

  it("awards 1 point for P8 and 0 beyond", () => {
    expect(SPRINT_POINTS_SYSTEM[7]).toBe(1);
    expect(SPRINT_POINTS_SYSTEM[8]).toBe(0);
  });
});

describe("FASTEST_LAP_POINT", () => {
  it("is 1", () => {
    expect(FASTEST_LAP_POINT).toBe(1);
  });
});
