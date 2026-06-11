import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(),
}));

vi.mock("@/lib/api/jolpica", async () => {
  const { createJolpicaMocks } = await import("@/test/mockJolpica");
  return createJolpicaMocks();
});

vi.mock("@/lib/stats/circuitRecords", () => ({
  computeCircuitRecords: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => Promise<unknown>) => fn,
}));

import { GET } from "@/app/api/circuit-records/route";
import { rateLimited } from "@/lib/api/withRateLimit";
import { getAllRaceResultsAtCircuit } from "@/lib/api/jolpica";
import { computeCircuitRecords } from "@/lib/stats/circuitRecords";
import { makeApiRequest } from "@/test/api";

describe("GET /api/circuit-records", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimited).mockReturnValue(null);
    vi.mocked(getAllRaceResultsAtCircuit).mockResolvedValue([] as never);
    vi.mocked(computeCircuitRecords).mockReturnValue({
      mostWins: null,
      mostPoles: null,
      fastestLap: null,
    });
  });

  it("returns 429 when rate-limited", async () => {
    vi.mocked(rateLimited).mockReturnValue(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
    );

    const res = await GET(makeApiRequest("/api/circuit-records", { circuitId: "monza" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid circuitId", async () => {
    const res = await GET(makeApiRequest("/api/circuit-records", { circuitId: "../../etc" }));
    expect(res.status).toBe(400);
  });

  it("returns records on success", async () => {
    vi.mocked(computeCircuitRecords).mockReturnValue({
      mostWins: { driverId: "hamilton", name: "Lewis Hamilton", count: 5 },
      mostPoles: null,
      fastestLap: null,
    });

    const res = await GET(makeApiRequest("/api/circuit-records", { circuitId: "monza" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.circuitId).toBe("monza");
    expect(body.records.mostWins.count).toBe(5);
  });
});
