import { describe, expect, it } from "vitest";
import { hasRaceFinished, RACE_FINISH_BUFFER_MS } from "@/lib/time/raceFinished";

// Fixed reference instants — no live clocks in fixtures per testing policy.
const RACE_START = Date.parse("2026-05-24T13:00:00Z");

describe("hasRaceFinished", () => {
  it("is false before the race starts", () => {
    expect(hasRaceFinished("2026-05-24", "13:00:00Z", RACE_START - 1000)).toBe(false);
  });

  it("is false during the race and within the finish buffer (race-day timings stay useful)", () => {
    expect(hasRaceFinished("2026-05-24", "13:00:00Z", RACE_START + 60 * 60 * 1000)).toBe(false);
    expect(
      hasRaceFinished("2026-05-24", "13:00:00Z", RACE_START + RACE_FINISH_BUFFER_MS - 1),
    ).toBe(false);
  });

  it("is true once the finish buffer after lights-out has elapsed", () => {
    expect(
      hasRaceFinished("2026-05-24", "13:00:00Z", RACE_START + RACE_FINISH_BUFFER_MS),
    ).toBe(true);
  });

  it("without a start time, flips only after the whole UTC race day has passed", () => {
    const duringDay = Date.parse("2026-05-24T18:00:00Z");
    const nextDay = Date.parse("2026-05-25T00:00:01Z");
    expect(hasRaceFinished("2026-05-24", null, duringDay)).toBe(false);
    expect(hasRaceFinished("2026-05-24", undefined, nextDay)).toBe(true);
  });

  it("is false for malformed or missing dates", () => {
    expect(hasRaceFinished("", "13:00:00Z", RACE_START)).toBe(false);
    expect(hasRaceFinished("not-a-date", null, RACE_START)).toBe(false);
  });

  it("falls back to the day-end rule when the time string is malformed", () => {
    const nextDay = Date.parse("2026-05-25T00:00:01Z");
    expect(hasRaceFinished("2026-05-24", "garbage", nextDay)).toBe(true);
    expect(hasRaceFinished("2026-05-24", "garbage", RACE_START)).toBe(false);
  });
});
