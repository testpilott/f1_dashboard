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

import { GET } from "@/app/api/standings/route";
import { makeApiRequest } from "@/test/api";

describe("GET /api/standings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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