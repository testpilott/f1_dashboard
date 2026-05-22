import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(() => null),
}));

vi.mock("@/lib/api/jolpica", () => ({
  getDriverStandings: vi.fn(),
  getSchedule: vi.fn(),
  getSeasonResults: vi.fn(),
}));

vi.mock("@/lib/projections/montecarlo", () => ({
  runProjections: vi.fn(),
}));

// `unstable_cache` caches by key across tests; we replace it with a passthrough
// so each test invocation actually exercises the inner pipeline.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
}));

import { GET } from "@/app/api/projections/route";
import {
  getDriverStandings,
  getSchedule,
  getSeasonResults,
} from "@/lib/api/jolpica";
import { runProjections } from "@/lib/projections/montecarlo";
import { makeApiRequest } from "@/test/api";

describe("GET /api/projections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for an invalid season", async () => {
    const res = await GET(makeApiRequest("/api/projections", { season: "abc" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid season/i);
  });

  it("returns 400 for an out-of-range season", async () => {
    const res = await GET(makeApiRequest("/api/projections", { season: "1980" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/out of range/i);
  });

  it("returns the projection payload when upstream calls resolve", async () => {
    vi.mocked(getDriverStandings).mockResolvedValue([{ Driver: { driverId: "ver" } }] as never);
    vi.mocked(getSchedule).mockResolvedValue([{ round: "1" }, { round: "2" }] as never);
    vi.mocked(getSeasonResults).mockResolvedValue([
      { round: "1", Results: [{ position: "1" }] },
    ] as never);
    vi.mocked(runProjections).mockReturnValue({ drivers: [{ id: "ver", winProbability: 0.7 }] } as never);

    const res = await GET(makeApiRequest("/api/projections", { season: "2026" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.drivers[0].id).toBe("ver");
    expect(runProjections).toHaveBeenCalledWith(expect.any(Array), expect.any(Array), 1);
  });

  it("returns 500 when an upstream fetch fails", async () => {
    vi.mocked(getDriverStandings).mockRejectedValue(new Error("timeout"));
    vi.mocked(getSchedule).mockResolvedValue([] as never);
    vi.mocked(getSeasonResults).mockResolvedValue([] as never);

    const res = await GET(makeApiRequest("/api/projections", { season: "2026" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/internal server error/i);
  });
});
