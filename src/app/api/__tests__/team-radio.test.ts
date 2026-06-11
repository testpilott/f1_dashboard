import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(),
}));

vi.mock("@/lib/api/jolpica", async () => {
  const { createJolpicaMocks } = await import("@/test/mockJolpica");
  return createJolpicaMocks();
});

vi.mock("@/lib/api/openf1", () => ({
  getSessions: vi.fn(),
  getTeamRadio: vi.fn(),
  getDriversForSession: vi.fn(),
}));

vi.mock("@/lib/stats/session-match", () => ({
  pickRaceSession: vi.fn(),
}));

import { GET } from "@/app/api/team-radio/route";
import { rateLimited } from "@/lib/api/withRateLimit";
import { getSchedule } from "@/lib/api/jolpica";
import { getDriversForSession, getSessions, getTeamRadio } from "@/lib/api/openf1";
import { pickRaceSession } from "@/lib/stats/session-match";
import { makeApiRequest } from "@/test/api";

describe("/api/team-radio availability handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(rateLimited).mockReturnValue(null);
    vi.mocked(getSchedule).mockResolvedValue([
      {
        round: "1",
        Circuit: { Location: { country: "Australia" } },
      },
    ] as unknown as Awaited<ReturnType<typeof getSchedule>>);
    vi.mocked(getSessions).mockResolvedValue([
      {
        session_key: 11234,
        session_name: "Race",
        session_type: "Race",
        country_name: "Australia",
        is_cancelled: false,
      },
    ] as unknown as Awaited<ReturnType<typeof getSessions>>);
    vi.mocked(pickRaceSession).mockReturnValue(11234);
    const drivers: Awaited<ReturnType<typeof getDriversForSession>> = [
      {
        driver_number: 1,
        broadcast_name: "M VERSTAPPEN",
        first_name: "Max",
        last_name: "Verstappen",
        full_name: "Max Verstappen",
        name_acronym: "VER",
        team_name: "Red Bull",
        team_colour: "3671C6",
        session_key: 11234,
        meeting_key: 1279,
      },
    ];
    vi.mocked(getDriversForSession).mockResolvedValue(drivers);
  });

  it("returns available=false with a clear reason when OpenF1 radio is unavailable", async () => {
    vi.mocked(getTeamRadio).mockRejectedValue(new Error("Request failed: 404 Not Found"));

    const res = await GET(makeApiRequest("/api/team-radio", { year: "2026", round: "1" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      available: false,
      reason: "Team radio data is not yet available from OpenF1 for this session.",
    });
  });

  it("returns available=true with reason when the race has zero clips", async () => {
    vi.mocked(getTeamRadio).mockResolvedValue([]);

    const res = await GET(makeApiRequest("/api/team-radio", { year: "2026", round: "1" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.available).toBe(true);
    expect(body.items).toEqual([]);
    expect(body.reason).toBe("No radio clips were broadcast during this session.");
    expect(body.sessionName).toBe("Race");
  });

  it("returns grouped clips when OpenF1 radio data exists", async () => {
    const clips: Awaited<ReturnType<typeof getTeamRadio>> = [
      {
        session_key: 11234,
        meeting_key: 1279,
        driver_number: 1,
        date: "2026-03-08T04:54:22.636000+00:00",
        recording_url: "https://example.com/clip-1.mp3",
      },
    ];
    vi.mocked(getTeamRadio).mockResolvedValue(clips);

    const res = await GET(makeApiRequest("/api/team-radio", { year: "2026", round: "1" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.available).toBe(true);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      driverNumber: 1,
      acronym: "VER",
      team: "Red Bull",
      colour: "3671C6",
    });
    expect(body.items[0].clips).toEqual([
      {
        date: "2026-03-08T04:54:22.636000+00:00",
        recording_url: "https://example.com/clip-1.mp3",
      },
    ]);
  });
});
