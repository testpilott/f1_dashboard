import { describe, expect, it } from "vitest";
import { buildUTCDate, formatInTz, formatCountdown } from "@/lib/time/format";

describe("buildUTCDate", () => {
  it("uses noon UTC when time is omitted", () => {
    expect(buildUTCDate("2026-06-11").toISOString()).toBe("2026-06-11T12:00:00.000Z");
  });

  it("uses the provided time in UTC", () => {
    expect(buildUTCDate("2026-06-11", "13:45:00").toISOString()).toBe("2026-06-11T13:45:00.000Z");
    expect(buildUTCDate("2026-06-11", "13:45:00Z").toISOString()).toBe("2026-06-11T13:45:00.000Z");
  });
});

describe("formatInTz", () => {
  it("formats a fixed instant in UTC", () => {
    const out = formatInTz(new Date("2026-06-11T12:00:00Z"), "UTC");
    expect(out).toContain("11 Jun");
    expect(out).toContain("12:00");
  });

  it("formats a fixed instant in Europe/London", () => {
    const out = formatInTz(new Date("2026-06-11T12:00:00Z"), "Europe/London");
    expect(out).toContain("11 Jun");
    expect(out).toContain("13:00");
  });
});

describe("formatCountdown", () => {
  it("formats zero milliseconds", () => {
    expect(formatCountdown(0)).toBe("0m 0s");
  });

  it("formats minutes and seconds", () => {
    expect(formatCountdown(9 * 60 * 1000 + 15 * 1000)).toBe("9m 15s");
  });

  it("formats hours", () => {
    expect(formatCountdown(2 * 3600 * 1000 + 5 * 60 * 1000 + 7 * 1000)).toBe("2h 5m 7s");
  });

  it("formats multi-day durations", () => {
    expect(formatCountdown(2 * 86400 * 1000 + 3 * 3600 * 1000 + 4 * 60 * 1000)).toBe("2d 3h 4m");
  });
});