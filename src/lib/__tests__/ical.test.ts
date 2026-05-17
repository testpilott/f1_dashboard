import { describe, it, expect } from "vitest";
import { buildICS, escapeText, foldLine } from "@/lib/ical";
import type { Race } from "@/lib/types";

function mkRace(p: Partial<Race> & { round: string; raceName: string; date: string }): Race {
  return {
    season: "2026",
    Circuit: {
      circuitId: "monza",
      circuitName: "Autodromo Nazionale Monza",
      Location: { locality: "Monza", country: "Italy", lat: "0", long: "0" },
    },
    ...p,
  } as unknown as Race;
}

const NOW = new Date("2026-01-01T00:00:00Z");

describe("escapeText", () => {
  it("escapes backslash, semicolon, comma and newlines", () => {
    expect(escapeText("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
  });
});

describe("foldLine", () => {
  it("leaves short lines untouched", () => {
    expect(foldLine("SUMMARY:Italian GP")).toBe("SUMMARY:Italian GP");
  });

  it("folds long lines with CRLF + leading space", () => {
    const folded = foldLine("X".repeat(200));
    const parts = folded.split("\r\n");
    expect(parts.length).toBeGreaterThan(1);
    expect(parts[0]).toHaveLength(75);
    expect(parts[1].startsWith(" ")).toBe(true);
  });
});

describe("buildICS", () => {
  it("wraps events in a VCALENDAR with CRLF endings", () => {
    const ics = buildICS([mkRace({ round: "1", raceName: "Italian GP", date: "2026-09-06", time: "13:00:00Z" })], { now: NOW });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
  });

  it("emits a timed 2-hour event when a start time is present", () => {
    const ics = buildICS(
      [mkRace({ round: "16", raceName: "Italian GP", date: "2026-09-06", time: "13:00:00Z" })],
      { now: NOW },
    );
    expect(ics).toContain("DTSTART:20260906T130000Z");
    expect(ics).toContain("DTEND:20260906T150000Z");
    expect(ics).toContain("DTSTAMP:20260101T000000Z");
    expect(ics).toContain("UID:f1-2026-r16@f1-dashboard");
  });

  it("emits an all-day event when no start time is given", () => {
    const ics = buildICS([mkRace({ round: "2", raceName: "Test GP", date: "2026-03-15" })], { now: NOW });
    expect(ics).toContain("DTSTART;VALUE=DATE:20260315");
    expect(ics).toContain("DTEND;VALUE=DATE:20260316");
  });

  it("escapes punctuation in SUMMARY/LOCATION", () => {
    const ics = buildICS(
      [mkRace({ round: "1", raceName: "São Paulo GP; round, one", date: "2026-11-08", time: "17:00:00Z" })],
      { now: NOW },
    );
    expect(ics).toContain("SUMMARY:São Paulo GP\\; round\\, one");
  });

  it("produces only the header/footer for an empty schedule", () => {
    const ics = buildICS([], { now: NOW });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).not.toContain("BEGIN:VEVENT");
  });

  it("tolerates a non-array input", () => {
    expect(buildICS(undefined as unknown as Race[], { now: NOW })).toContain("BEGIN:VCALENDAR");
  });
});
