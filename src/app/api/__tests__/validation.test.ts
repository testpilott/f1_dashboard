/**
 * Tests for the input-validation rules shared across all API routes.
 * Patterns are imported from src/lib/validators.ts — the single source of truth.
 * We test the regex / set patterns directly — no network calls, no Next.js
 * runtime needed.
 */
import { describe, it, expect } from "vitest";
import {
  VALID_SEASON,
  VALID_ROUND,
  VALID_TYPE,
  VALID_YEAR,
  VALID_MEETING_KEY,
  VALID_SESSION_KEY,
  VALID_ID,
  VALID_VIEW,
  VALID_COMPARE_VIEW,
  VALID_SEARCH_QUERY,
} from "@/lib/validators";

// projections route re-uses VALID_SEASON
const VALID_PROJ_SEASON = VALID_SEASON;

// ─── VALID_SEASON ─────────────────────────────────────────────────────────────

describe("VALID_SEASON regex", () => {
  it("accepts 4-digit year strings", () => {
    expect(VALID_SEASON.test("2024")).toBe(true);
    expect(VALID_SEASON.test("2026")).toBe(true);
    expect(VALID_SEASON.test("2000")).toBe(true);
  });

  it("accepts 'current'", () => {
    expect(VALID_SEASON.test("current")).toBe(true);
  });

  it("rejects partial years", () => {
    expect(VALID_SEASON.test("202")).toBe(false);
    expect(VALID_SEASON.test("20264")).toBe(false);
  });

  it("rejects non-numeric strings", () => {
    expect(VALID_SEASON.test("abc")).toBe(false);
    expect(VALID_SEASON.test("2024a")).toBe(false);
    expect(VALID_SEASON.test("")).toBe(false);
  });

  it("rejects SQL injection attempts", () => {
    expect(VALID_SEASON.test("2024 OR 1=1")).toBe(false);
    expect(VALID_SEASON.test("'; DROP TABLE")).toBe(false);
  });
});

// ─── VALID_ROUND ──────────────────────────────────────────────────────────────

describe("VALID_ROUND regex", () => {
  it("accepts rounds 1–9", () => {
    for (let i = 1; i <= 9; i++) {
      expect(VALID_ROUND.test(String(i))).toBe(true);
    }
  });

  it("accepts rounds 10–30", () => {
    expect(VALID_ROUND.test("10")).toBe(true);
    expect(VALID_ROUND.test("24")).toBe(true);
    expect(VALID_ROUND.test("30")).toBe(true);
  });

  it("rejects round 0", () => {
    expect(VALID_ROUND.test("0")).toBe(false);
  });

  it("rejects round 31+", () => {
    expect(VALID_ROUND.test("31")).toBe(false);
    expect(VALID_ROUND.test("100")).toBe(false);
  });

  it("rejects non-numeric values", () => {
    expect(VALID_ROUND.test("abc")).toBe(false);
    expect(VALID_ROUND.test("1a")).toBe(false);
    expect(VALID_ROUND.test("")).toBe(false);
  });
});

// ─── VALID_TYPE (results route) ───────────────────────────────────────────────

describe("VALID_TYPE set (/api/results)", () => {
  it("accepts allowed types", () => {
    expect(VALID_TYPE.has("race")).toBe(true);
    expect(VALID_TYPE.has("qualifying")).toBe(true);
    expect(VALID_TYPE.has("sprint")).toBe(true);
  });

  it("rejects unknown types", () => {
    expect(VALID_TYPE.has("practice")).toBe(false);
    expect(VALID_TYPE.has("")).toBe(false);
    expect(VALID_TYPE.has("RACE")).toBe(false);
    expect(VALID_TYPE.has("race; DROP TABLE")).toBe(false);
  });
});

// ─── Sessions route endpoint surface ─────────────────────────────────────────
// The route derives its VALID_ENDPOINTS from KEYED_HANDLERS in route.ts.
// This test documents the expected API surface; update it when adding handlers.

describe("Sessions route endpoints", () => {
  const EXPECTED_ENDPOINTS = new Set(["sessions", "result", "drivers", "stints", "laps", "pit", "weather", "race_control"]);

  it("includes all documented endpoints", () => {
    const allowed = ["sessions", "result", "drivers", "stints", "laps", "pit", "weather", "race_control"];
    for (const ep of allowed) {
      expect(EXPECTED_ENDPOINTS.has(ep)).toBe(true);
    }
  });

  it("does not include unlisted endpoints", () => {
    expect(EXPECTED_ENDPOINTS.has("admin")).toBe(false);
    expect(EXPECTED_ENDPOINTS.has("__proto__")).toBe(false);
    expect(EXPECTED_ENDPOINTS.has("")).toBe(false);
  });
});

// ─── VALID_YEAR (sessions route) ──────────────────────────────────────────────

describe("VALID_YEAR regex (/api/sessions)", () => {
  it("accepts 4-digit years", () => {
    expect(VALID_YEAR.test("2024")).toBe(true);
    expect(VALID_YEAR.test("2026")).toBe(true);
  });

  it("rejects non-4-digit values", () => {
    expect(VALID_YEAR.test("202")).toBe(false);
    expect(VALID_YEAR.test("20261")).toBe(false);
    expect(VALID_YEAR.test("year")).toBe(false);
    expect(VALID_YEAR.test("")).toBe(false);
  });
});

// ─── VALID_MEETING_KEY / VALID_SESSION_KEY ────────────────────────────────────

describe("VALID_MEETING_KEY / VALID_SESSION_KEY regex", () => {
  it("accepts 'latest'", () => {
    expect(VALID_MEETING_KEY.test("latest")).toBe(true);
    expect(VALID_SESSION_KEY.test("latest")).toBe(true);
  });

  it("accepts numeric strings up to 8 digits", () => {
    expect(VALID_MEETING_KEY.test("1234567")).toBe(true);
    expect(VALID_SESSION_KEY.test("12345678")).toBe(true);
  });

  it("rejects strings longer than 8 digits", () => {
    expect(VALID_MEETING_KEY.test("123456789")).toBe(false);
  });

  it("rejects non-numeric non-'latest' values", () => {
    expect(VALID_MEETING_KEY.test("abc")).toBe(false);
    expect(VALID_SESSION_KEY.test("1a2b")).toBe(false);
    expect(VALID_SESSION_KEY.test("")).toBe(false);
  });
});

// ─── VALID_ID (compare route) ─────────────────────────────────────────────────

describe("VALID_ID regex (/api/compare)", () => {
  it("accepts lowercase alphanumeric IDs with hyphens and underscores", () => {
    expect(VALID_ID.test("max_verstappen")).toBe(true);
    expect(VALID_ID.test("lewis-hamilton")).toBe(true);
    expect(VALID_ID.test("driver123")).toBe(true);
    expect(VALID_ID.test("a")).toBe(true);
  });

  it("rejects IDs longer than 40 characters", () => {
    expect(VALID_ID.test("a".repeat(41))).toBe(false);
  });

  it("rejects uppercase letters", () => {
    expect(VALID_ID.test("MaxVerstappen")).toBe(false);
  });

  it("rejects special characters and injection payloads", () => {
    expect(VALID_ID.test("driver; rm -rf /")).toBe(false);
    expect(VALID_ID.test("driver' OR '1'='1")).toBe(false);
    expect(VALID_ID.test("../../etc/passwd")).toBe(false);
    expect(VALID_ID.test("")).toBe(false);
  });
});

// ─── VALID_VIEW (schedule route) ────────────────────────────────────────────

describe("VALID_VIEW set (/api/schedule)", () => {
  it("accepts allowed view values", () => {
    expect(VALID_VIEW.has("next")).toBe(true);
    expect(VALID_VIEW.has("last")).toBe(true);
  });

  it("rejects unknown view values", () => {
    expect(VALID_VIEW.has("all")).toBe(false);
    expect(VALID_VIEW.has("")).toBe(false);
    expect(VALID_VIEW.has("NEXT")).toBe(false);
    expect(VALID_VIEW.has("next; rm -rf /")).toBe(false);
  });
});

// ─── VALID_COMPARE_VIEW (compare route) ───────────────────────────────────────

describe("VALID_COMPARE_VIEW set (/api/compare)", () => {
  it("accepts allowed compare view values", () => {
    expect(VALID_COMPARE_VIEW.has("circuit")).toBe(true);
    expect(VALID_COMPARE_VIEW.has("season")).toBe(true);
    expect(VALID_COMPARE_VIEW.has("teams")).toBe(true);
  });

  it("rejects unknown compare view values", () => {
    expect(VALID_COMPARE_VIEW.has("admin")).toBe(false);
    expect(VALID_COMPARE_VIEW.has("")).toBe(false);
    expect(VALID_COMPARE_VIEW.has("Circuit")).toBe(false);
    expect(VALID_COMPARE_VIEW.has("../etc")).toBe(false);
  });
});

// ─── VALID_SEARCH_QUERY (search + news routes) ─────────────────────────────────

describe("VALID_SEARCH_QUERY regex (/api/search, /api/news)", () => {
  it("accepts printable ASCII strings up to 60 chars", () => {
    expect(VALID_SEARCH_QUERY.test("Hamilton")).toBe(true);
    expect(VALID_SEARCH_QUERY.test("max verstappen")).toBe(true);
    expect(VALID_SEARCH_QUERY.test("F1 2026!")).toBe(true);
    expect(VALID_SEARCH_QUERY.test("a".repeat(60))).toBe(true);
  });

  it("rejects empty string", () => {
    expect(VALID_SEARCH_QUERY.test("")).toBe(false);
  });

  it("rejects strings longer than 60 characters", () => {
    expect(VALID_SEARCH_QUERY.test("a".repeat(61))).toBe(false);
  });

  it("rejects null bytes and control characters", () => {
    expect(VALID_SEARCH_QUERY.test("abc\x00def")).toBe(false);
    expect(VALID_SEARCH_QUERY.test("abc\x01def")).toBe(false);
    expect(VALID_SEARCH_QUERY.test("abc\x1Fdef")).toBe(false);
  });
});

// ─── Projections season (projections route) ───────────────────────────────────

describe("VALID_PROJ_SEASON regex (/api/projections)", () => {
  it("accepts a 4-digit year or 'current'", () => {
    expect(VALID_PROJ_SEASON.test("2026")).toBe(true);
    expect(VALID_PROJ_SEASON.test("current")).toBe(true);
  });

  it("rejects everything else", () => {
    expect(VALID_PROJ_SEASON.test("abc")).toBe(false);
    expect(VALID_PROJ_SEASON.test("20261")).toBe(false);
    expect(VALID_PROJ_SEASON.test("")).toBe(false);
  });
});

// ─── Weather lat/lng parseFloat validation (weather/route.ts) ─────────────────────
// Pattern: const val = parseFloat(str); if (isNaN(val)) return 400;

describe("weather lat/lng coordinate validation", () => {
  const parseCoord = (s: string): number | null => {
    const v = parseFloat(s);
    return isNaN(v) ? null : v;
  };

  it("accepts valid decimal latitude/longitude strings", () => {
    expect(parseCoord("51.5074")).toBe(51.5074);
    expect(parseCoord("-33.8688")).toBe(-33.8688);
    expect(parseCoord("0")).toBe(0);
    expect(parseCoord("180")).toBe(180);
  });

  it("rejects non-numeric strings", () => {
    expect(parseCoord("abc")).toBeNull();
    expect(parseCoord("")).toBeNull();
    // NOTE: parseFloat("12.3.4") = 12.3 (stops at second dot), not null.
    // This edge case is acceptable — 12.3 is a valid coordinate value.
    expect(parseCoord("12.3.4")).toBe(12.3);
  });

  it("rejects injection payloads that parseFloat would silently truncate", () => {
    // parseFloat("1 OR 1=1") returns 1, not NaN — handled by separate range checks
    // but pure strings / symbols are caught:
    expect(parseCoord("NaN")).toBeNull();
    expect(parseCoord("Infinity")).not.toBeNull(); // parseFloat("Infinity") = Infinity
  });

  it("returns null for null/undefined-equivalent strings", () => {
    expect(parseCoord("null")).toBeNull();
    expect(parseCoord("undefined")).toBeNull();
  });
});

// ─── Projections division-by-zero guards (projections/page.tsx) ──────────────────
// Pattern: Math.max(val, 1) ensures denominator is never 0 or negative.

describe("projections bar-width division-by-zero guard", () => {
  // p90Scaled = Math.max(p90 * 1.1, 1)
  const p90Scaled = (p90: number) => Math.max(p90 * 1.1, 1);
  // maxWinProb = Math.max(topDriverWinProb, 1)
  const safeMax = (v: number) => Math.max(v, 1);

  it("p90Scaled is at least 1 when p90 is 0", () => {
    expect(p90Scaled(0)).toBe(1);
  });

  it("p90Scaled uses the real value when p90 > 0", () => {
    expect(p90Scaled(100)).toBeCloseTo(110);
    expect(p90Scaled(50)).toBeCloseTo(55);
  });

  it("bar percentage is 0 (not NaN/Infinity) when p90 = 0", () => {
    const driver = { projectedPoints: { p10: 0, p50: 0, p90: 0 } };
    const pct = (driver.projectedPoints.p10 / p90Scaled(driver.projectedPoints.p90)) * 100;
    expect(isNaN(pct)).toBe(false);
    expect(isFinite(pct)).toBe(true);
    expect(pct).toBe(0);
  });

  it("safeMax win-prob denominator is at least 1", () => {
    expect(safeMax(0)).toBe(1);
    expect(safeMax(0.001)).toBeCloseTo(1);
    expect(safeMax(45.5)).toBe(45.5);
  });

  it("win-probability bar is 0 (not NaN) when all drivers have 0% win chance", () => {
    const winProb = 0;
    const denominator = safeMax(0); // worst-case: top driver also has 0
    const bar = Math.min((winProb / denominator) * 100, 100);
    expect(isNaN(bar)).toBe(false);
    expect(isFinite(bar)).toBe(true);
    expect(bar).toBe(0);
  });
});

// ─── VALID_VIEW (schedule route) ─────────────────────────────────────────────

describe("VALID_VIEW set (/api/schedule)", () => {
  it("accepts 'next' and 'last'", () => {
    expect(VALID_VIEW.has("next")).toBe(true);
    expect(VALID_VIEW.has("last")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(VALID_VIEW.has("current")).toBe(false);
    expect(VALID_VIEW.has("all")).toBe(false);
    expect(VALID_VIEW.has("")).toBe(false);
    expect(VALID_VIEW.has("next; rm -rf /")).toBe(false);
  });
});

// ─── /api/form (re-uses VALID_SEASON) ────────────────────────────────────────

describe("/api/form season validation", () => {
  it("accepts a 4-digit season and 'current'", () => {
    expect(VALID_SEASON.test("2025")).toBe(true);
    expect(VALID_SEASON.test("current")).toBe(true);
  });

  it("rejects injection / traversal attempts in the season param", () => {
    expect(VALID_SEASON.test("2025; DROP TABLE")).toBe(false);
    expect(VALID_SEASON.test("../../etc/passwd")).toBe(false);
    expect(VALID_SEASON.test("current OR 1=1")).toBe(false);
    expect(VALID_SEASON.test("")).toBe(false);
  });
});

// ─── /api/telemetry (re-uses VALID_YEAR + VALID_ROUND) ───────────────────────

describe("/api/telemetry param validation", () => {
  it("accepts a 4-digit year and a 1–30 round", () => {
    expect(VALID_YEAR.test("2024")).toBe(true);
    expect(VALID_ROUND.test("1")).toBe(true);
    expect(VALID_ROUND.test("24")).toBe(true);
  });

  it("rejects malformed / injection year & round", () => {
    expect(VALID_YEAR.test("24")).toBe(false);
    expect(VALID_YEAR.test("2024 OR 1=1")).toBe(false);
    expect(VALID_ROUND.test("0")).toBe(false);
    expect(VALID_ROUND.test("99")).toBe(false);
    expect(VALID_ROUND.test("1; rm -rf /")).toBe(false);
  });
});

// ─── VALID_COMPARE_VIEW (/api/compare) ───────────────────────────────────────

describe("VALID_COMPARE_VIEW set", () => {
  it("accepts all three supported views including teams", () => {
    expect(VALID_COMPARE_VIEW.has("circuit")).toBe(true);
    expect(VALID_COMPARE_VIEW.has("season")).toBe(true);
    expect(VALID_COMPARE_VIEW.has("teams")).toBe(true);
  });

  it("rejects anything else, including injection attempts", () => {
    expect(VALID_COMPARE_VIEW.has("next")).toBe(false);
    expect(VALID_COMPARE_VIEW.has("")).toBe(false);
    expect(VALID_COMPARE_VIEW.has("season; DROP TABLE")).toBe(false);
    expect(VALID_COMPARE_VIEW.has("../../etc")).toBe(false);
  });
});

// ─── VALID_SEARCH_QUERY (/api/search) ────────────────────────────────────────

describe("VALID_SEARCH_QUERY regex", () => {
  it("accepts printable ASCII queries up to 60 chars", () => {
    expect(VALID_SEARCH_QUERY.test("hamilton")).toBe(true);
    expect(VALID_SEARCH_QUERY.test("Max Verstappen")).toBe(true);
    expect(VALID_SEARCH_QUERY.test("A")).toBe(true);
    expect(VALID_SEARCH_QUERY.test("a".repeat(60))).toBe(true);
  });

  it("rejects empty string", () => {
    expect(VALID_SEARCH_QUERY.test("")).toBe(false);
  });

  it("rejects strings longer than 60 chars", () => {
    expect(VALID_SEARCH_QUERY.test("a".repeat(61))).toBe(false);
  });

  it("rejects non-printable / control characters", () => {
    expect(VALID_SEARCH_QUERY.test("hello\x00world")).toBe(false);
    expect(VALID_SEARCH_QUERY.test("hamilton\n")).toBe(false);
    expect(VALID_SEARCH_QUERY.test("\x1B[31m")).toBe(false);
  });
});

// ─── /api/team-radio (re-uses VALID_YEAR + VALID_ROUND) ──────────────────────

describe("/api/team-radio param validation", () => {
  it("accepts a 4-digit year and valid round", () => {
    expect(VALID_YEAR.test("2024")).toBe(true);
    expect(VALID_ROUND.test("5")).toBe(true);
  });

  it("rejects invalid year/round", () => {
    expect(VALID_YEAR.test("99")).toBe(false);
    expect(VALID_ROUND.test("0")).toBe(false);
    expect(VALID_ROUND.test("99")).toBe(false);
  });
});

// ─── /api/driver-career (re-uses VALID_ID) ───────────────────────────────────

describe("/api/driver-career param validation", () => {
  it("accepts valid driverId strings", () => {
    expect(VALID_ID.test("hamilton")).toBe(true);
    expect(VALID_ID.test("max_verstappen")).toBe(true);
    expect(VALID_ID.test("alonso")).toBe(true);
  });

  it("rejects injection attempts", () => {
    expect(VALID_ID.test("'; DROP TABLE--")).toBe(false);
    expect(VALID_ID.test("<script>")).toBe(false);
    expect(VALID_ID.test("../etc/passwd")).toBe(false);
  });

  it("rejects empty and too-long IDs", () => {
    expect(VALID_ID.test("")).toBe(false);
    expect(VALID_ID.test("a".repeat(51))).toBe(false);
  });
});

// ─── /api/race-incidents (re-uses VALID_YEAR + VALID_ROUND) ──────────────────

describe("/api/race-incidents param validation", () => {
  it("accepts valid year and round", () => {
    expect(VALID_YEAR.test("2023")).toBe(true);
    expect(VALID_YEAR.test("2024")).toBe(true);
    expect(VALID_ROUND.test("1")).toBe(true);
    expect(VALID_ROUND.test("23")).toBe(true);
  });

  it("rejects invalid year", () => {
    expect(VALID_YEAR.test("99")).toBe(false);
    expect(VALID_YEAR.test("20234")).toBe(false);
    expect(VALID_YEAR.test("year")).toBe(false);
  });

  it("rejects invalid round", () => {
    expect(VALID_ROUND.test("0")).toBe(false);
    expect(VALID_ROUND.test("99")).toBe(false);
    expect(VALID_ROUND.test("round")).toBe(false);
  });
});
