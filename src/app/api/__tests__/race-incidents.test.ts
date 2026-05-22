import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(),
}));

vi.mock("@/lib/api/jolpica", () => ({
  getSchedule: vi.fn(),
}));

vi.mock("@/lib/incidents/buildIncidents", () => ({
  buildIncidentsForRace: vi.fn(),
}));

import { GET } from "@/app/api/race-incidents/route";
import { rateLimited } from "@/lib/api/withRateLimit";
import { getSchedule } from "@/lib/api/jolpica";
import { buildIncidentsForRace } from "@/lib/incidents/buildIncidents";
import { makeApiRequest } from "@/test/api";

const MOCK_INCIDENT = {
  x: 11,
  y: -9,
  lap_number: 33,
  driver_number: 44,
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
    vi.mocked(buildIncidentsForRace).mockResolvedValue({
      available: true,
      incidents: [MOCK_INCIDENT],
    });
  });

  it("returns rate-limit response when blocked", async () => {
    vi.mocked(rateLimited).mockReturnValue(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }),
    );

    const res = await GET(makeApiRequest("/api/race-incidents", { year: "2026", round: "7" }));
    expect(res.status).toBe(429);
  });

  it("returns available=false when round is missing from schedule", async () => {
    vi.mocked(getSchedule).mockResolvedValue([] as unknown as Awaited<ReturnType<typeof getSchedule>>);

    const res = await GET(makeApiRequest("/api/race-incidents", { year: "2026", round: "7" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ available: false, reason: "Unknown race" });
  });

  it("returns available=false when buildIncidentsForRace reports unavailable", async () => {
    vi.mocked(buildIncidentsForRace).mockResolvedValue({
      available: false,
      reason: "OpenF1 covers 2023+ only",
    });

    const res = await GET(makeApiRequest("/api/race-incidents", { year: "2026", round: "7" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ available: false, reason: "OpenF1 covers 2023+ only" });
  });

  it("returns incidents from the build helper on success", async () => {
    const res = await GET(makeApiRequest("/api/race-incidents", { year: "2026", round: "7" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(buildIncidentsForRace).toHaveBeenCalledWith("2026", "7", "Canada");
    expect(body).toEqual({ available: true, incidents: [MOCK_INCIDENT] });
  });

  it("returns 400 for missing year or round", async () => {
    const res = await GET(makeApiRequest("/api/race-incidents", { round: "7" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for malformed year", async () => {
    const res = await GET(makeApiRequest("/api/race-incidents", { year: "20xx", round: "7" }));
    expect(res.status).toBe(400);
  });

  it("returns 500 when getSchedule throws", async () => {
    vi.mocked(getSchedule).mockRejectedValue(new Error("schedule down"));
    const res = await GET(makeApiRequest("/api/race-incidents", { year: "2026", round: "7" }));
    expect(res.status).toBe(500);
  });
});
