import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(() => null),
}));

vi.mock("@/lib/api/jolpica", async () => {
  const { createJolpicaMocks } = await import("@/test/mockJolpica");
  return createJolpicaMocks();
});

vi.mock("@/lib/projections/montecarlo", () => ({
  runProjections: vi.fn(),
}));

// `unstable_cache` caches by key across tests; replace with a passthrough so
// each invocation exercises the inner pipeline. `revalidateTag` is a no-op here.
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  revalidateTag: vi.fn(),
}));

import { GET } from "@/app/api/projections/route";
import { POST as SNAPSHOT_POST, GET as SNAPSHOT_GET } from "@/app/api/projections/snapshot/route";
import {
  getDriverStandings,
  getConstructorStandings,
  getSchedule,
  getSeasonResultsFirstPage,
} from "@/lib/api/jolpica";
import { runProjections } from "@/lib/projections/montecarlo";
import { makeApiRequest } from "@/test/api";

function authedRequest(path: string, params: Record<string, string> = {}) {
  const req = makeApiRequest(path, params);
  const headers = new Headers(req.headers);
  headers.set("authorization", "Bearer test-secret");
  return new Request(req.url, { method: req.method, headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-secret";
});

describe("GET /api/projections", () => {
  it("returns 400 for invalid season", async () => {
    const res = await GET(makeApiRequest("/api/projections", { season: "abc" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for out-of-range season", async () => {
    const res = await GET(makeApiRequest("/api/projections", { season: "1980" }));
    expect(res.status).toBe(400);
  });

  it("serves projection from the shared cache on every request (no instance-warm gate)", async () => {
    vi.mocked(getDriverStandings).mockResolvedValue([{ Driver: { driverId: "ver" } }] as never);
    vi.mocked(getConstructorStandings).mockResolvedValue([{ Constructor: { constructorId: "red_bull", name: "Red Bull" }, points: "100" }] as never);
    vi.mocked(getSchedule).mockResolvedValue([{ round: "1" }, { round: "2" }] as never);
    vi.mocked(getSeasonResultsFirstPage).mockResolvedValue([
      { round: "1", Results: [{ position: "1" }] },
    ] as never);
    vi.mocked(runProjections).mockReturnValue({
      drivers: [{ id: "ver", winProbability: 0.7 }],
      constructors: [{ id: "red_bull", championProbability: 0.7 }],
    } as never);

    // No prior warmSnapshot call — route still serves the projection because
    // unstable_cache is the single source of truth, not an in-memory flag.
    const res = await GET(makeApiRequest("/api/projections", { season: "2026" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.drivers[0].id).toBe("ver");
  });

  it("returns 500 when the pipeline throws", async () => {
    vi.mocked(getDriverStandings).mockRejectedValue(new Error("upstream"));
    vi.mocked(getConstructorStandings).mockResolvedValue([] as never);
    vi.mocked(getSchedule).mockResolvedValue([] as never);
    vi.mocked(getSeasonResultsFirstPage).mockResolvedValue([] as never);
    const res = await GET(makeApiRequest("/api/projections", { season: "2026" }));
    expect(res.status).toBe(500);
  });

  it("serves cached projection after snapshot has been warmed by the cron", async () => {
    vi.mocked(getDriverStandings).mockResolvedValue([{ Driver: { driverId: "ver" } }] as never);
    vi.mocked(getConstructorStandings).mockResolvedValue([{ Constructor: { constructorId: "red_bull", name: "Red Bull" }, points: "100" }] as never);
    vi.mocked(getSchedule).mockResolvedValue([{ round: "1" }, { round: "2" }] as never);
    vi.mocked(getSeasonResultsFirstPage).mockResolvedValue([
      { round: "1", Results: [{ position: "1" }] },
    ] as never);
    vi.mocked(runProjections).mockReturnValue({
      drivers: [{ id: "ver", winProbability: 0.7 }],
      constructors: [{ id: "red_bull", championProbability: 0.7 }],
    } as never);

    const warmRes = await SNAPSHOT_POST(authedRequest("/api/projections/snapshot", { season: "2026" }));
    expect(warmRes.status).toBe(200);

    const res = await GET(makeApiRequest("/api/projections", { season: "2026" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.drivers[0].id).toBe("ver");
  });
});

describe("POST /api/projections/snapshot", () => {
  it("returns 401 without bearer secret", async () => {
    const res = await SNAPSHOT_POST(makeApiRequest("/api/projections/snapshot", { season: "2026" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong bearer secret", async () => {
    const req = makeApiRequest("/api/projections/snapshot", { season: "2026" });
    const headers = new Headers(req.headers);
    headers.set("authorization", "Bearer wrong");
    const res = await SNAPSHOT_POST(new Request(req.url, { headers }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    const res = await SNAPSHOT_POST(authedRequest("/api/projections/snapshot", { season: "2026" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid season", async () => {
    const res = await SNAPSHOT_POST(authedRequest("/api/projections/snapshot", { season: "abc" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 and warms cache on success", async () => {
    vi.mocked(getDriverStandings).mockResolvedValue([{ Driver: { driverId: "ver" } }] as never);
    vi.mocked(getConstructorStandings).mockResolvedValue([{ Constructor: { constructorId: "red_bull", name: "Red Bull" }, points: "100" }] as never);
    vi.mocked(getSchedule).mockResolvedValue([{ round: "1" }] as never);
    vi.mocked(getSeasonResultsFirstPage).mockResolvedValue([] as never);
    vi.mocked(runProjections).mockReturnValue({
      drivers: [{ id: "ver" }, { id: "lec" }],
      constructors: [{ id: "red_bull" }],
    } as never);

    const res = await SNAPSHOT_POST(authedRequest("/api/projections/snapshot", { season: "2026" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, season: "2026", driverCount: 2 });
    expect(runProjections).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when pipeline throws", async () => {
    vi.mocked(getDriverStandings).mockRejectedValue(new Error("upstream"));
    vi.mocked(getConstructorStandings).mockResolvedValue([] as never);
    vi.mocked(getSchedule).mockResolvedValue([] as never);
    vi.mocked(getSeasonResultsFirstPage).mockResolvedValue([] as never);

    const res = await SNAPSHOT_POST(authedRequest("/api/projections/snapshot", { season: "2026" }));
    expect(res.status).toBe(500);
  });

  it("GET handler also requires auth", async () => {
    const res = await SNAPSHOT_GET(makeApiRequest("/api/projections/snapshot"));
    expect(res.status).toBe(401);
  });
});
