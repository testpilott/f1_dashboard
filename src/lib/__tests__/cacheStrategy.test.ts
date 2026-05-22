import { describe, it, expect } from "vitest";
import {
  adaptiveRevalidate,
  cacheKeySuffix,
  classifySessionState,
} from "@/lib/cacheStrategy";

// Helper: build a Date at a specific UTC weekday
function dateOnDay(day: 0 | 1 | 2 | 3 | 4 | 5 | 6): Date {
  // 2026-05-18 is a Monday (day=1)
  const base = new Date("2026-05-18T12:00:00Z");
  const diff = day - base.getDay();
  const d = new Date(base);
  d.setUTCDate(base.getUTCDate() + diff);
  return d;
}

const monday = dateOnDay(1);
const friday = dateOnDay(5);
const saturday = dateOnDay(6);
const sunday = dateOnDay(0);

describe("adaptiveRevalidate", () => {
  it("returns base standings TTL on a weekday", () => {
    expect(adaptiveRevalidate("standings", monday)).toBe(300);
  });

  it("returns shorter standings TTL on Friday", () => {
    expect(adaptiveRevalidate("standings", friday)).toBe(60);
  });

  it("returns shorter standings TTL on Saturday", () => {
    expect(adaptiveRevalidate("standings", saturday)).toBe(60);
  });

  it("returns shorter standings TTL on Sunday", () => {
    expect(adaptiveRevalidate("standings", sunday)).toBe(60);
  });

  it("schedule TTL is unchanged on race weekend (static data)", () => {
    expect(adaptiveRevalidate("schedule", friday)).toBe(3600);
    expect(adaptiveRevalidate("schedule", monday)).toBe(3600);
  });

  it("telemetry TTL is shorter on race weekend", () => {
    expect(adaptiveRevalidate("telemetry", friday)).toBe(30);
    expect(adaptiveRevalidate("telemetry", monday)).toBe(60);
  });

  it("results TTL tightens on race weekend", () => {
    expect(adaptiveRevalidate("results", saturday)).toBe(120);
    expect(adaptiveRevalidate("results", monday)).toBe(3600);
  });

  it("projections TTL is 24h (cached daily, not per-request)", () => {
    expect(adaptiveRevalidate("projections", friday)).toBe(86400);
    expect(adaptiveRevalidate("projections", monday)).toBe(86400);
  });

  it("form TTL tightens on race weekend", () => {
    expect(adaptiveRevalidate("form", sunday)).toBe(60);
    expect(adaptiveRevalidate("form", monday)).toBe(300);
  });

  it("defaults to current time when no date argument passed", () => {
    // Should not throw and should return a positive number
    expect(adaptiveRevalidate("standings")).toBeGreaterThan(0);
  });
});

describe("five-tier DataClass keys", () => {
  it("liveTelemetry: 10s off-week, 5s race weekend", () => {
    expect(adaptiveRevalidate("liveTelemetry", monday)).toBe(10);
    expect(adaptiveRevalidate("liveTelemetry", friday)).toBe(5);
    expect(adaptiveRevalidate("liveTelemetry", saturday)).toBe(5);
    expect(adaptiveRevalidate("liveTelemetry", sunday)).toBe(5);
  });

  it("liveStandings / liveResults / liveIncidents: 5m off-week, 1m race weekend", () => {
    for (const key of ["liveStandings", "liveResults", "liveIncidents"] as const) {
      expect(adaptiveRevalidate(key, monday)).toBe(300);
      expect(adaptiveRevalidate(key, sunday)).toBe(60);
    }
  });

  it("weather: 1h off-week, 15m race weekend", () => {
    expect(adaptiveRevalidate("weather", monday)).toBe(3600);
    expect(adaptiveRevalidate("weather", saturday)).toBe(900);
  });

  it("socialBio: 1h off-week, 15m race weekend", () => {
    expect(adaptiveRevalidate("socialBio", monday)).toBe(3600);
    expect(adaptiveRevalidate("socialBio", sunday)).toBe(900);
  });

  it("weekly tier keys: 7d regardless of day", () => {
    for (const key of [
      "careerStats",
      "driverProfile",
      "circuitRecords",
      "projectionSnapshot",
    ] as const) {
      expect(adaptiveRevalidate(key, monday)).toBe(604800);
      expect(adaptiveRevalidate(key, sunday)).toBe(604800);
    }
  });

  it("seasonal tier keys: 24h off-week, 6h race weekend", () => {
    for (const key of ["seasonSchedule", "teams", "circuitMeta"] as const) {
      expect(adaptiveRevalidate(key, monday)).toBe(86400);
      expect(adaptiveRevalidate(key, friday)).toBe(21600);
    }
  });
});

describe("classifySessionState", () => {
  it("returns race-weekend on Friday, Saturday, Sunday", () => {
    expect(classifySessionState(friday)).toBe("race-weekend");
    expect(classifySessionState(saturday)).toBe("race-weekend");
    expect(classifySessionState(sunday)).toBe("race-weekend");
  });

  it("returns off-week on Monday through Thursday", () => {
    expect(classifySessionState(monday)).toBe("off-week");
    expect(classifySessionState(dateOnDay(2))).toBe("off-week");
    expect(classifySessionState(dateOnDay(3))).toBe("off-week");
    expect(classifySessionState(dateOnDay(4))).toBe("off-week");
  });

  it("defaults to current time when no date argument passed", () => {
    const result = classifySessionState();
    expect(["live", "race-weekend", "off-week"]).toContain(result);
  });
});

describe("cacheKeySuffix", () => {
  it("returns a stable, DataClass-tagged suffix", () => {
    expect(cacheKeySuffix("careerStats")).toBe("dc:careerStats");
    expect(cacheKeySuffix("liveTelemetry")).toBe("dc:liveTelemetry");
  });

  it("different DataClasses produce different suffixes", () => {
    expect(cacheKeySuffix("weather")).not.toBe(cacheKeySuffix("news"));
  });
});
