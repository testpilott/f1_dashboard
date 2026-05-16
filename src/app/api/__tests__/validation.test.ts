/**
 * Tests for the input-validation rules shared across all API routes.
 * We test the regex / set patterns directly — no network calls, no Next.js
 * runtime needed.
 */
import { describe, it, expect } from "vitest";

// ─── Patterns copied from the route handlers ──────────────────────────────────
// (Keep these in sync with the source files)

const VALID_SEASON = /^(\d{4}|current)$/;
const VALID_ROUND = /^([1-9]|[1-2][0-9]|30)$/;
const VALID_TYPE = new Set(["race", "qualifying", "sprint"]);

const VALID_ENDPOINTS = new Set([
  "sessions", "result", "drivers", "stints", "laps", "pit", "weather", "race_control",
]);
const VALID_YEAR = /^\d{4}$/;
const VALID_MEETING_KEY = /^(\d{1,8}|latest)$/;
const VALID_SESSION_KEY = /^(\d{1,8}|latest)$/;

// compare route
const VALID_ID = /^[a-z0-9_-]{1,40}$/;

// projections route
const VALID_PROJ_SEASON = /^(\d{4}|current)$/;

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

// ─── VALID_ENDPOINTS (sessions route) ────────────────────────────────────────

describe("VALID_ENDPOINTS set (/api/sessions)", () => {
  it("accepts all documented endpoints", () => {
    const allowed = ["sessions", "result", "drivers", "stints", "laps", "pit", "weather", "race_control"];
    for (const ep of allowed) {
      expect(VALID_ENDPOINTS.has(ep)).toBe(true);
    }
  });

  it("rejects unlisted endpoints", () => {
    expect(VALID_ENDPOINTS.has("admin")).toBe(false);
    expect(VALID_ENDPOINTS.has("__proto__")).toBe(false);
    expect(VALID_ENDPOINTS.has("")).toBe(false);
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
