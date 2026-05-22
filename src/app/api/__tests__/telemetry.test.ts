import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(() => null),
}));

vi.mock("@/lib/api/jolpica", () => ({
  getSchedule: vi.fn(),
}));

vi.mock("@/lib/api/openf1", () => ({
  getSessions: vi.fn(),
  getLaps: vi.fn(),
  getStints: vi.fn(),
  getDriversForSession: vi.fn(),
}));

vi.mock("@/lib/stats/session-match", () => ({
  pickRaceSession: vi.fn(),
}));

vi.mock("@/lib/stats/pace", () => ({
  stintSummaries: vi.fn(() => []),
}));

import { GET } from "@/app/api/telemetry/route";
import { getSchedule } from "@/lib/api/jolpica";
import {
  getSessions,
  getLaps,
  getStints,
  getDriversForSession,
} from "@/lib/api/openf1";
import { pickRaceSession } from "@/lib/stats/session-match";
import { stintSummaries } from "@/lib/stats/pace";
import { makeApiRequest } from "@/test/api";

const RACE = {
  round: "5",
  raceName: "Monaco GP",
  Circuit: { Location: { country: "Monaco" } },
};

describe("GET /api/telemetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSchedule).mockResolvedValue([RACE] as never);
    vi.mocked(getSessions).mockResolvedValue([
      { session_key: 9999, session_name: "Race", country_name: "Monaco" },
    ] as never);
    vi.mocked(pickRaceSession).mockReturnValue(9999);
    vi.mocked(getLaps).mockResolvedValue([] as never);
    vi.mocked(getStints).mockResolvedValue([] as never);
    vi.mocked(getDriversForSession).mockResolvedValue([
      { driver_number: 1, name_acronym: "VER", team_name: "Red Bull", team_colour: "3671C6" },
    ] as never);
  });

  it("returns 400 when year is missing", async () => {
    const res = await GET(makeApiRequest("/api/telemetry", { round: "5" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid round", async () => {
    const res = await GET(
      makeApiRequest("/api/telemetry", { year: "2026", round: "abc" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns available=false when OpenF1 has no matching session", async () => {
    vi.mocked(pickRaceSession).mockReturnValue(null);
    const res = await GET(
      makeApiRequest("/api/telemetry", { year: "2026", round: "5" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(false);
    expect(body.reason).toMatch(/no telemetry/i);
  });

  it("returns a driver list with stints when upstream data is present", async () => {
    vi.mocked(stintSummaries).mockReturnValue([{ stint: 1, laps: 20, compound: "soft" }] as never);
    const res = await GET(
      makeApiRequest("/api/telemetry", { year: "2026", round: "5" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(true);
    expect(body.race).toBe("Monaco GP");
    expect(body.drivers[0].acronym).toBe("VER");
    expect(body.drivers[0].colour).toBe("#3671C6");
  });

  it("returns 500 when the schedule fetch fails", async () => {
    vi.mocked(getSchedule).mockRejectedValue(new Error("timeout"));
    const res = await GET(
      makeApiRequest("/api/telemetry", { year: "2026", round: "5" }),
    );
    expect(res.status).toBe(500);
  });
});
