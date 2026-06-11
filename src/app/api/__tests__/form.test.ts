import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(() => null),
}));

vi.mock("@/lib/api/jolpica", async () => {
  const { createJolpicaMocks } = await import("@/test/mockJolpica");
  return createJolpicaMocks();
});

import { GET } from "@/app/api/form/route";
import { getRaceResults, getSchedule } from "@/lib/api/jolpica";
import { makeApiRequest } from "@/test/api";

const PAST_RACE = {
  season: "2026",
  round: "1",
  raceName: "Bahrain GP",
  date: "2026-03-08",
  time: "15:00:00Z",
  Circuit: {
    circuitId: "bahrain",
    circuitName: "Bahrain International Circuit",
    Location: { locality: "Sakhir", country: "Bahrain" },
  },
};

describe("GET /api/form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for an invalid season", async () => {
    const res = await GET(makeApiRequest("/api/form", { season: "bad" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid season/i);
  });

  it("returns a form payload with per-driver entries for the most recent races", async () => {
    vi.mocked(getSchedule).mockResolvedValue([PAST_RACE] as never);
    vi.mocked(getRaceResults).mockResolvedValue([
      {
        position: "1",
        Driver: { driverId: "ver" },
        Constructor: { constructorId: "red_bull" },
      },
      {
        position: "2",
        Driver: { driverId: "ham" },
        Constructor: { constructorId: "mercedes" },
      },
    ] as never);

    const res = await GET(makeApiRequest("/api/form", { season: "2026" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.season).toBe("2026");
    expect(body.window).toBe(5);
    expect(Object.keys(body.form)).toEqual(expect.arrayContaining(["ver", "ham"]));
  });

  it("returns 500 when the schedule fetch fails", async () => {
    vi.mocked(getSchedule).mockRejectedValue(new Error("timeout"));
    const res = await GET(makeApiRequest("/api/form", { season: "2026" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/internal server error/i);
  });
});
