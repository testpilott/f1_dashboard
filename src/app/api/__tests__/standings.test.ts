import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockReadSnapshotOrFetch } = vi.hoisted(() => ({
  mockReadSnapshotOrFetch: vi.fn(),
}));

vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(() => null),
}));

vi.mock("@/lib/snapshots/readSnapshotOrFetch", () => ({
  readSnapshotOrFetch: mockReadSnapshotOrFetch,
}));

vi.mock("@/lib/api/jolpica", async () => {
  const { createJolpicaMocks } = await import("@/test/mockJolpica");
  return createJolpicaMocks();
});

import { GET } from "@/app/api/standings/route";
import { getDriverStandings, getConstructorStandings } from "@/lib/api/jolpica";
import { makeApiRequest } from "@/test/api";

const mockGetDriverStandings = getDriverStandings as ReturnType<typeof vi.fn>;
const mockGetConstructorStandings = getConstructorStandings as ReturnType<typeof vi.fn>;

describe("GET /api/standings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bypasses snapshots and returns live data for current season", async () => {
    mockGetDriverStandings.mockResolvedValueOnce([
      { position: "1", Driver: { driverId: "hamilton", givenName: "Lewis", familyName: "Hamilton" } },
    ]);
    mockGetConstructorStandings.mockResolvedValueOnce([
      { position: "1", Constructor: { constructorId: "ferrari", name: "Ferrari" } },
    ]);

    const res = await GET(makeApiRequest("/api/standings", { season: "current" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockReadSnapshotOrFetch).not.toHaveBeenCalled();
    expect(mockGetDriverStandings).toHaveBeenCalledWith("current");
    expect(mockGetConstructorStandings).toHaveBeenCalledWith("current");
    expect(body.source).toBe("live");
    expect(body.drivers[0].Driver.driverId).toBe("hamilton");
  });

  it("returns 400 for an invalid season", async () => {
    const res = await GET(makeApiRequest("/api/standings", { season: "bad" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/invalid season/i);
  });

  it("returns drivers and constructors from snapshot", async () => {
    mockReadSnapshotOrFetch.mockResolvedValue({
      drivers: [{ position: "1", Driver: { driverId: "verstappen", givenName: "Max", familyName: "Verstappen" } }],
      constructors: [{ position: "1", Constructor: { constructorId: "red_bull", name: "Red Bull Racing" } }],
      snapshotAt: "2026-01-01T00:00:00.000Z",
      source: "snapshot",
    });

    const res = await GET(makeApiRequest("/api/standings", { season: "2026" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockReadSnapshotOrFetch).toHaveBeenCalledWith(
      expect.objectContaining({ key: "standings-2026", dataClass: "liveStandings" })
    );
    expect(body.drivers).toHaveLength(1);
    expect(body.constructors).toHaveLength(1);
    expect(body.drivers[0].Driver.driverId).toBe("verstappen");
    expect(body.constructors[0].Constructor.constructorId).toBe("red_bull");
  });

  it("degrades gracefully when snapshot and live both fail", async () => {
    mockReadSnapshotOrFetch.mockRejectedValue(new Error("timeout"));

    const res = await GET(makeApiRequest("/api/standings", { season: "2026" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.available).toBe(false);
    expect(body.reason).toMatch(/upstream unavailable/i);
    expect(Array.isArray(body.drivers)).toBe(true);
    expect(Array.isArray(body.constructors)).toBe(true);
  });
});