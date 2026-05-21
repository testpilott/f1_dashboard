import { describe, it, expect } from "vitest";
import { adaptiveRevalidate } from "@/lib/cacheStrategy";

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
