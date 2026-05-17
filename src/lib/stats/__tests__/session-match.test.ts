import { describe, it, expect } from "vitest";
import { pickRaceSession } from "@/lib/stats/session-match";
import type { OpenF1Session } from "@/lib/types";

function sess(
  key: number,
  country: string,
  type: OpenF1Session["session_type"] = "Race",
  cancelled = false,
  name?: string,
): OpenF1Session {
  return {
    session_key: key,
    session_name: name ?? type,
    session_type: type,
    date_start: "",
    date_end: "",
    meeting_key: 1,
    circuit_key: 1,
    circuit_short_name: "",
    country_name: country,
    country_code: "",
    location: "",
    gmt_offset: "",
    year: 2024,
    is_cancelled: cancelled,
  };
}

describe("pickRaceSession", () => {
  it("matches the Race session by exact country", () => {
    const sessions = [sess(1, "Italy", "Qualifying"), sess(2, "Italy", "Race")];
    expect(pickRaceSession(sessions, "Italy")).toBe(2);
  });

  it("resolves Jolpica/OpenF1 country aliases (UK -> Great Britain)", () => {
    expect(pickRaceSession([sess(9, "Great Britain")], "UK")).toBe(9);
    expect(pickRaceSession([sess(9, "United States")], "USA")).toBe(9);
  });

  it("ignores non-Race and cancelled sessions", () => {
    const sessions = [
      sess(1, "Brazil", "Sprint"),
      sess(2, "Brazil", "Race", true),
      sess(3, "Brazil", "Race"),
    ];
    expect(pickRaceSession(sessions, "Brazil")).toBe(3);
  });

  it("prefers the Grand Prix over the Sprint on a sprint weekend", () => {
    // Real OpenF1: the Sprint is session_type "Race" with session_name
    // "Sprint", and it appears before the Grand Prix chronologically.
    const sessions = [
      sess(10, "Brazil", "Race", false, "Sprint"),
      sess(11, "Brazil", "Race", false, "Race"),
    ];
    expect(pickRaceSession(sessions, "Brazil")).toBe(11);
  });

  it("still resolves a non-sprint weekend (only a Race session)", () => {
    const sessions = [
      sess(20, "Italy", "Qualifying", false, "Qualifying"),
      sess(21, "Italy", "Race", false, "Race"),
    ];
    expect(pickRaceSession(sessions, "Italy")).toBe(21);
  });

  it("falls back to a partial country match", () => {
    expect(pickRaceSession([sess(5, "United States")], "United States of America")).toBe(5);
  });

  it("returns null when there is no Race session for the country", () => {
    expect(pickRaceSession([sess(1, "Spain", "Race")], "Monaco")).toBeNull();
  });

  it("returns null for empty / invalid input", () => {
    expect(pickRaceSession([], "Italy")).toBeNull();
    expect(pickRaceSession(undefined as unknown as OpenF1Session[], "Italy")).toBeNull();
    expect(pickRaceSession([sess(1, "Italy")], "")).toBeNull();
  });
});
