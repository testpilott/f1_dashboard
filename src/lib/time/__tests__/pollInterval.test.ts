import { describe, expect, it } from "vitest";
import { clampPollIntervalMs, MIN_POLL_INTERVAL_MS } from "@/lib/time/pollInterval";

const FALLBACK = 60 * 60 * 1000;

describe("clampPollIntervalMs", () => {
  it("passes sane server-provided intervals through unchanged", () => {
    expect(clampPollIntervalMs(10 * 60 * 1000, FALLBACK)).toBe(10 * 60 * 1000);
  });

  it("clamps dangerously small intervals up to the floor — a 5ms poll would DoS our own API", () => {
    expect(clampPollIntervalMs(5, FALLBACK)).toBe(MIN_POLL_INTERVAL_MS);
    expect(clampPollIntervalMs(1000, FALLBACK)).toBe(MIN_POLL_INTERVAL_MS);
  });

  it("returns the fallback for zero, negative, NaN, Infinity, and non-number input", () => {
    expect(clampPollIntervalMs(0, FALLBACK)).toBe(FALLBACK);
    expect(clampPollIntervalMs(-5000, FALLBACK)).toBe(FALLBACK);
    expect(clampPollIntervalMs(NaN, FALLBACK)).toBe(FALLBACK);
    expect(clampPollIntervalMs(Infinity, FALLBACK)).toBe(FALLBACK);
    expect(clampPollIntervalMs(undefined, FALLBACK)).toBe(FALLBACK);
    expect(clampPollIntervalMs("600000", FALLBACK)).toBe(FALLBACK);
  });

  it("exposes a floor of at least 60 seconds", () => {
    expect(MIN_POLL_INTERVAL_MS).toBeGreaterThanOrEqual(60_000);
  });
});
