import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(),
}));

vi.mock("@/lib/api/jolpica", () => ({
  getSchedule: vi.fn(),
}));

vi.mock("@/lib/api/openf1", () => ({
  getSessions: vi.fn(),
  getRaceControl: vi.fn(),
  getLocations: vi.fn(),
}));

vi.mock("@/lib/stats/session-match", () => ({
  pickRaceSession: vi.fn(),
}));

vi.mock("@/lib/stats/incidents", () => ({
  classifyIncidents: vi.fn(),
  closestByTime: vi.fn(),
}));

import { GET } from "@/app/api/race-incidents/route";
import { rateLimited } from "@/lib/api/withRateLimit";
import { getSchedule } from "@/lib/api/jolpica";
import { getLocations, getRaceControl, getSessions } from "@/lib/api/openf1";
import { classifyIncidents, closestByTime } from "@/lib/stats/incidents";
import { pickRaceSession } from "@/lib/stats/session-match";

function makeRequest(year = "2026", round = "7") {
  return new Request(`http://localhost/api/race-incidents?year=${year}&round=${round}`);
}

const MOCK_INCIDENT = {
  date: "2026-06-09T10:00:10.000Z",
  driver_number: 44,
  lap_number: 33,
  flag: "YELLOW",
  category: "CarEvent",
  message: "Car 44 stopped in Turn 4",
};

describe("GET /api/race-incidents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimited).mockReturnValue(null);
    vi.mocked(getSchedule).mockResolvedValue([
      {
        round: "7",
        Circuit: { Location: { country: "Canada" } },
      },
    ] as unknown as Awaited<ReturnType<typeof getSchedule>>);
    vi.mocked(getSessions).mockResolvedValue(
      [{ session_key: 9001 }] as unknown as Awaited<ReturnType<typeof getSessions>>,
    );
    vi.mocked(pickRaceSession).mockReturnValue(9001);
    vi.mocked(getRaceControl).mockResolvedValue(
      [{ category: "CarEvent" }] as unknown as Awaited<ReturnType<typeof getRaceControl>>,
    );
    vi.mocked(classifyIncidents).mockReturnValue(
      [MOCK_INCIDENT] as unknown as ReturnType<typeof classifyIncidents>,
    );
    vi.mocked(getLocations).mockResolvedValue(
      [{ x: 11, y: -9, date: MOCK_INCIDENT.date }] as unknown as Awaited<
        ReturnType<typeof getLocations>
      >,
    );
    vi.mocked(closestByTime).mockReturnValue(
      { x: 11, y: -9 } as unknown as ReturnType<typeof closestByTime>,
    );
  });

  it("returns rate-limit response when blocked", async () => {
    vi.mocked(rateLimited).mockReturnValue(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }),
    );

    const res = await GET(makeRequest());
    expect(res.status).toBe(429);
  });

  it("returns available=false when round is missing from schedule", async () => {
    vi.mocked(getSchedule).mockResolvedValue([] as unknown as Awaited<ReturnType<typeof getSchedule>>);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ available: false, reason: "Unknown race" });
  });

  it("returns available=false when no race session can be resolved", async () => {
    vi.mocked(pickRaceSession).mockReturnValue(null);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ available: false, reason: "OpenF1 covers 2023+ only" });
  });

  it("returns incidents with mapped location coordinates on success", async () => {
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(classifyIncidents).toHaveBeenCalledTimes(1);
    expect(getLocations).toHaveBeenCalledWith(
      9001,
      44,
      "2026-06-09T10:00:06.000Z",
      "2026-06-09T10:00:14.000Z",
    );
    expect(body).toEqual({
      available: true,
      incidents: [
        {
          x: 11,
          y: -9,
          lap_number: 33,
          driver_number: 44,
          flag: "YELLOW",
          category: "CarEvent",
          message: "Car 44 stopped in Turn 4",
        },
      ],
    });
  });

  it("keeps incident payload when location fetch fails", async () => {
    vi.mocked(getLocations).mockRejectedValue(new Error("location API timeout"));

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      available: true,
      incidents: [
        {
          x: null,
          y: null,
          lap_number: 33,
          driver_number: 44,
          flag: "YELLOW",
          category: "CarEvent",
          message: "Car 44 stopped in Turn 4",
        },
      ],
    });
  });
});
