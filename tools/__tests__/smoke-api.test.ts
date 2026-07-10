import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertSnapshotFreshness } from "../smoke-api.mjs";

describe("smoke-api snapshot freshness", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-10T14:18:33.396Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows weekly driver-career snapshots that are newer than the weekly threshold", () => {
    expect(() =>
      assertSnapshotFreshness(
        {
          snapshotMaxAgeHours: 8 * 24,
          snapshotWorkflow: "snapshot-weekly",
        },
        {
          snapshotAt: "2026-07-06T06:54:33.396Z",
          source: "jolpica",
        },
      ),
    ).not.toThrow();
  });

  it("still fails daily-backed snapshots that exceed the 48 hour budget", () => {
    expect(() =>
      assertSnapshotFreshness(
        {
          snapshotMaxAgeHours: 48,
          snapshotWorkflow: "snapshot-daily",
        },
        {
          snapshotAt: "2026-07-06T06:54:33.396Z",
          source: "jolpica",
        },
      ),
    ).toThrow(/103\.4h stale \(max 48h\) — snapshot-daily workflow may be stuck/);
  });
});