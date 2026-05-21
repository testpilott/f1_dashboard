import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(),
}));

vi.mock("@/lib/api/jolpica", () => ({
  getSchedule: vi.fn(),
}));

vi.mock("@/lib/api/openf1", () => ({
  getSessions: vi.fn(),
}));

vi.mock("@/lib/stats/session-match", () => ({
  pickRaceSession: vi.fn(),
}));

vi.mock("@/lib/api/multiviewer", () => ({
  getCircuitInfo: vi.fn(),
}));

import { GET } from "@/app/api/circuit-info/route";
import { rateLimited } from "@/lib/api/withRateLimit";
import { getSchedule } from "@/lib/api/jolpica";
import { getSessions } from "@/lib/api/openf1";
import { pickRaceSession } from "@/lib/stats/session-match";
import { getCircuitInfo } from "@/lib/api/multiviewer";
import { makeApiRequest } from "@/test/api";

const MOCK_RACE = {
  round: "5",
  Circuit: {
    circuitName: "Marina Bay Street Circuit",
    Location: { country: "Singapore", locality: "Marina Bay" },
  },
};

const MOCK_SESSION = {
  session_key: 9999,
  circuit_key: 61,
  session_name: "Race",
  session_type: "Race",
  country_name: "Singapore",
};

const MOCK_CIRCUIT_INFO = {
  corners: [
    { number: 1, angle: 40, length: 400, trackPosition: { x: 100, y: 200 } },
    { number: 2, angle: -90, length: 800, trackPosition: { x: 300, y: 100 } },
  ],
  x: [0, 100, 200, 300],
  y: [0, 200, 150, 100],
  trackPositionTime: [0, 15, 30, 45],
  rotation: 335,
  raceDate: "2026-09-21",
};

describe("/api/circuit-info", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimited).mockReturnValue(null);
    vi.mocked(getSchedule).mockResolvedValue(
      [MOCK_RACE] as unknown as Awaited<ReturnType<typeof getSchedule>>,
    );
    vi.mocked(getSessions).mockResolvedValue(
      [MOCK_SESSION] as unknown as Awaited<ReturnType<typeof getSessions>>,
    );
    vi.mocked(pickRaceSession).mockReturnValue(9999);
    vi.mocked(getCircuitInfo).mockResolvedValue(
      MOCK_CIRCUIT_INFO as unknown as Awaited<ReturnType<typeof getCircuitInfo>>,
    );
  });

  it("returns 400 when year is missing", async () => {
    const req = makeApiRequest("/api/circuit-info", { round: "5" });
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/year and round/i);
  });

  it("returns 400 when year is invalid", async () => {
    const req = makeApiRequest("/api/circuit-info", { year: "abcd", round: "5" });
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid year/i);
  });

  it("returns available=false when race is not found in schedule", async () => {
    vi.mocked(getSchedule).mockResolvedValue([]);
    const res = await GET(makeApiRequest("/api/circuit-info", { year: "2026", round: "5" }));
    const body = await res.json();
    expect(body.available).toBe(false);
    expect(body.reason).toMatch(/race not found/i);
  });

  it("returns available=false when no OpenF1 session matches", async () => {
    vi.mocked(pickRaceSession).mockReturnValue(null);
    const res = await GET(makeApiRequest("/api/circuit-info", { year: "2026", round: "5" }));
    const body = await res.json();
    expect(body.available).toBe(false);
    expect(body.reason).toMatch(/not available/i);
  });

  it("returns available=false when Multiviewer throws", async () => {
    vi.mocked(getCircuitInfo).mockRejectedValue(new Error("Multiviewer fetch failed: 404"));
    const res = await GET(makeApiRequest("/api/circuit-info", { year: "2026", round: "5" }));
    const body = await res.json();
    expect(body.available).toBe(false);
    expect(body.reason).toMatch(/unavailable/i);
  });

  it("returns circuit info with corners and track points on success", async () => {
    const res = await GET(makeApiRequest("/api/circuit-info", { year: "2026", round: "5" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.available).toBe(true);
    expect(body.circuitName).toBe("Marina Bay Street Circuit");
    expect(body.country).toBe("Singapore");
    expect(body.locality).toBe("Marina Bay");
    expect(body.rotation).toBe(335);
    expect(body.corners).toHaveLength(2);
    expect(body.corners[0]).toEqual({ number: 1, x: 100, y: 200, length: 400 });
    expect(body.trackX).toEqual([0, 100, 200, 300]);
    expect(body.trackY).toEqual([0, 200, 150, 100]);
    expect(body.trackPositionTime).toEqual([0, 15, 30, 45]);
  });

  it("handles malformed corners array gracefully (returns empty corners)", async () => {
    vi.mocked(getCircuitInfo).mockResolvedValue({
      ...MOCK_CIRCUIT_INFO,
      corners: null,
    } as unknown as Awaited<ReturnType<typeof getCircuitInfo>>);
    const res = await GET(makeApiRequest("/api/circuit-info", { year: "2026", round: "5" }));
    const body = await res.json();
    expect(body.available).toBe(true);
    expect(body.corners).toEqual([]);
  });

  it("handles missing x/y arrays gracefully (returns empty arrays)", async () => {
    vi.mocked(getCircuitInfo).mockResolvedValue({
      ...MOCK_CIRCUIT_INFO,
      x: undefined,
      y: undefined,
    } as unknown as Awaited<ReturnType<typeof getCircuitInfo>>);
    const res = await GET(makeApiRequest("/api/circuit-info", { year: "2026", round: "5" }));
    const body = await res.json();
    expect(body.available).toBe(true);
    expect(body.trackX).toEqual([]);
    expect(body.trackY).toEqual([]);
  });
});
