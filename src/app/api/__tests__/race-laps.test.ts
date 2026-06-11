import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(),
}));

vi.mock("@/lib/api/jolpica", async () => {
  const { createJolpicaMocks } = await import("@/test/mockJolpica");
  return createJolpicaMocks();
});

import { GET } from "@/app/api/race-laps/route";
import { rateLimited } from "@/lib/api/withRateLimit";
import { getRaceLaps, getRacePitstops } from "@/lib/api/jolpica";
import { makeApiRequest } from "@/test/api";

describe("GET /api/race-laps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimited).mockReturnValue(null);
    vi.mocked(getRaceLaps).mockResolvedValue([
      { number: "1", Timings: [{ driverId: "hamilton", position: "1", time: "1:22.000" }] },
    ] as never);
    vi.mocked(getRacePitstops).mockResolvedValue([
      { driverId: "hamilton", lap: "20", stop: "1", duration: "2.500" },
    ] as never);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(rateLimited).mockReturnValue(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
    );

    const res = await GET(makeApiRequest("/api/race-laps", { year: "2010", round: "1" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid params", async () => {
    const res = await GET(makeApiRequest("/api/race-laps", { year: "bad", round: "1" }));
    expect(res.status).toBe(400);
  });

  it("returns series and pitstop markers", async () => {
    const res = await GET(makeApiRequest("/api/race-laps", { year: "2010", round: "1" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.series).toHaveLength(1);
    expect(body.series[0]).toEqual({ lap: 1, ms: 82000, driverId: "hamilton" });
    expect(body.pitstops[0].lap).toBe(20);
  });
});
