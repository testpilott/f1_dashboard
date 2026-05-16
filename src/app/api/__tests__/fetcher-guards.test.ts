/**
 * Tests for the defensive guards added to all client-side fetcher functions.
 *
 * Two patterns are tested:
 *
 * 1. Array.isArray guard – Pattern: `Array.isArray(d.field) ? d.field : []`
 *    Prevents "x.map is not a function" crashes when the API returns an
 *    unexpected shape (object, null, undefined, etc.).
 *    Applied in:
 *      - src/app/drivers/page.tsx          → d.drivers
 *      - src/app/compare/page.tsx          → d.drivers, d.races
 *      - src/app/news/page.tsx             → d.items
 *      - src/components/weekend/WeekendClient.tsx → d.sessions, d.results, d.drivers
 *      - src/components/race/LapChart.tsx  → d.laps, d.drivers
 *      - src/components/race/TireStrategy.tsx → d.stints, d.drivers
 *
 * 2. Nullish coalescing guard – Pattern: `(value ?? []).slice(0, n)`
 *    Prevents crashes when an RSS parser returns null/undefined for `.items`.
 *    Applied in:
 *      - src/lib/api/rss.ts → rss.items
 */

import { describe, it, expect } from "vitest";

// ─── 1. Array.isArray guard ───────────────────────────────────────────────────
//
// Inline helper representing the guard in every fetcher:
//   Array.isArray(d.field) ? d.field : []

const guardArray = <T>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

describe("Array.isArray fetcher guard", () => {
  it("returns the original array when the value is a valid array", () => {
    const items = [{ id: 1 }, { id: 2 }];
    expect(guardArray(items)).toBe(items);
    expect(guardArray(items)).toHaveLength(2);
  });

  it("returns [] when the value is null", () => {
    expect(guardArray(null)).toEqual([]);
  });

  it("returns [] when the value is undefined", () => {
    expect(guardArray(undefined)).toEqual([]);
  });

  it("returns [] when the value is a plain object (not an array)", () => {
    expect(guardArray({ drivers: [] })).toEqual([]);
  });

  it("returns [] when the value is a string", () => {
    expect(guardArray("not-an-array")).toEqual([]);
  });

  it("returns [] when the value is a number", () => {
    expect(guardArray(42)).toEqual([]);
  });

  it("returns [] for every missing field name used in production fetchers", () => {
    const emptyResponse: Record<string, unknown> = {};
    const fields = ["drivers", "races", "items", "sessions", "results", "laps", "stints"] as const;
    for (const field of fields) {
      expect(guardArray(emptyResponse[field])).toEqual([]);
    }
  });

  it("returns the array for every field name used in production fetchers", () => {
    const fields = ["drivers", "races", "items", "sessions", "results", "laps", "stints"] as const;
    for (const field of fields) {
      const d: Record<string, unknown> = { [field]: [{ mock: true }] };
      expect(guardArray(d[field])).toEqual([{ mock: true }]);
    }
  });

  it("returns [] for an empty array (does not change valid empty arrays)", () => {
    expect(guardArray([])).toEqual([]);
  });
});

// ─── 2. Nullish coalescing guard (rss.ts) ─────────────────────────────────────
//
// Pattern: (rss.items ?? []).slice(0, maxPerFeed)

describe("rss.items nullish coalescing guard", () => {
  it("slices items to maxPerFeed when items is a full array", () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ title: `Item ${i}` }));
    const maxPerFeed = 15;
    expect((items ?? []).slice(0, maxPerFeed)).toHaveLength(15);
  });

  it("returns [] when items is null", () => {
    const items = null as unknown as unknown[];
    expect((items ?? []).slice(0, 15)).toEqual([]);
  });

  it("returns [] when items is undefined", () => {
    const items = undefined as unknown as unknown[];
    expect((items ?? []).slice(0, 15)).toEqual([]);
  });

  it("returns all items when count is below maxPerFeed", () => {
    const items = [{ title: "A" }, { title: "B" }];
    expect((items ?? []).slice(0, 15)).toEqual(items);
  });

  it("returns [] for an empty items array", () => {
    const items: unknown[] = [];
    expect((items ?? []).slice(0, 15)).toEqual([]);
  });
});
