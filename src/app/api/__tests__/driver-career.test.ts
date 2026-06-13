import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
}));

vi.mock("@/lib/snapshots/readSnapshotOrFetch", () => ({
  readSnapshotOrFetch: async <T,>(opts: { liveFn: () => Promise<T> }) => opts.liveFn(),
}));

vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(),
}));

vi.mock("@/lib/api/jolpica", async () => {
  const { createJolpicaMocks } = await import("@/test/mockJolpica");
  return createJolpicaMocks();
});

import { GET } from "@/app/api/driver-career/route";
import { rateLimited } from "@/lib/api/withRateLimit";
import {
  getDriverCareerFastestLaps,
  getDriverCareerP2,
  getDriverCareerP3,
  getDriverCareerStarts,
  getDriverCareerWins,
  getDriverCareerChampionships,
  getDriverSeasons,
} from "@/lib/api/jolpica";
import { makeApiRequest } from "@/test/api";

describe("GET /api/driver-career", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimited).mockReturnValue(null);
    vi.mocked(getDriverCareerWins).mockResolvedValue("60");
    vi.mocked(getDriverCareerP2).mockResolvedValue("20");
    vi.mocked(getDriverCareerP3).mockResolvedValue("18");
    vi.mocked(getDriverCareerStarts).mockResolvedValue("210");
    vi.mocked(getDriverCareerFastestLaps).mockResolvedValue("44");
    vi.mocked(getDriverCareerChampionships).mockResolvedValue("0");
    vi.mocked(getDriverSeasons).mockResolvedValue([2021, 2022, 2023, 2024, 2025]);
  });

  it("returns rate-limit response when blocked", async () => {
    vi.mocked(rateLimited).mockReturnValue(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }),
    );

    const res = await GET(makeApiRequest("/api/driver-career", { driverId: "max_verstappen" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid driverId", async () => {
    const res = await GET(makeApiRequest("/api/driver-career", { driverId: "INVALID DRIVER" }));
    expect(res.status).toBe(400);
  });

  it("returns career totals when all fetchers resolve", async () => {
    const res = await GET(makeApiRequest("/api/driver-career", { driverId: "max_verstappen" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      driverId: "max_verstappen",
      source: "live",
      career: {
        wins: 60,
        podiums: 98,
        starts: 210,
        fastestLaps: 44,
        championships: 0,
      },
    });
    expect(typeof body.snapshotAt).toBe("string");
  });

  it("degrades to a best-effort 200 payload when a required upstream stat fetcher fails", async () => {
    vi.mocked(getDriverCareerStarts).mockRejectedValue(new Error("starts endpoint down"));

    const res = await GET(makeApiRequest("/api/driver-career", { driverId: "hamilton" }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      driverId: "hamilton",
      source: "degraded-live",
      career: {
        wins: 60,
        podiums: 98,
        starts: null,
        fastestLaps: 44,
        championships: 0,
      },
    });
    expect(typeof body.snapshotAt).toBe("string");
  });

  it("degrades to a best-effort 200 payload when championship lookup rejects", async () => {
    vi.mocked(getDriverCareerChampionships).mockRejectedValue(new Error("championship lookup failed"));

    const res = await GET(makeApiRequest("/api/driver-career", { driverId: "hamilton" }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      driverId: "hamilton",
      source: "degraded-live",
      career: {
        wins: 60,
        podiums: 98,
        starts: 210,
        fastestLaps: 44,
        championships: null,
      },
    });
    expect(typeof body.snapshotAt).toBe("string");
  });

  it("returns 500 when every upstream call fails", async () => {
    vi.mocked(getDriverCareerWins).mockRejectedValue(new Error("wins down"));
    vi.mocked(getDriverCareerP2).mockRejectedValue(new Error("p2 down"));
    vi.mocked(getDriverCareerP3).mockRejectedValue(new Error("p3 down"));
    vi.mocked(getDriverCareerStarts).mockRejectedValue(new Error("starts down"));
    vi.mocked(getDriverCareerFastestLaps).mockRejectedValue(new Error("fastest down"));
    vi.mocked(getDriverCareerChampionships).mockRejectedValue(new Error("titles down"));

    const res = await GET(makeApiRequest("/api/driver-career", { driverId: "hamilton" }));

    expect(res.status).toBe(500);
  });
});
