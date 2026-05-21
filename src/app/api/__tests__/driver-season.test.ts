import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/fetchWithTimeout", () => ({
  fetchWithTimeout: vi.fn(),
}));
vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(() => null),
}));

import { GET } from "@/app/api/driver-season/route";
import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";

const mockFetch = fetchWithTimeout as ReturnType<typeof vi.fn>;

function makeReq(params: Record<string, string>) {
  return new Request(
    "http://localhost/api/driver-season?" + new URLSearchParams(params).toString(),
  );
}

function okResponse(data: unknown) {
  return Promise.resolve({ ok: true, json: async () => data });
}

const MOCK_RACES = [
  {
    round: "1",
    raceName: "Bahrain Grand Prix",
    Results: [
      { position: "1", positionText: "1", grid: "1", points: "25", status: "Finished", FastestLap: { rank: "1" } },
    ],
  },
  {
    round: "2",
    raceName: "Saudi Arabian Grand Prix",
    Results: [{ position: "2", positionText: "2", grid: "3", points: "18", status: "Finished" }],
  },
  {
    round: "3",
    raceName: "Australian Grand Prix",
    Results: [{ position: "0", positionText: "R", grid: "2", points: "0", status: "Accident" }],
  },
];

describe("GET /api/driver-season", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for invalid season", async () => {
    const res = await GET(makeReq({ season: "bad", driverId: "max_verstappen" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid driverId (uppercase / special chars)", async () => {
    const res = await GET(makeReq({ season: "2026", driverId: "INVALID DRIVER!!" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for injection attempt in driverId", async () => {
    const res = await GET(makeReq({ season: "2026", driverId: "'; DROP TABLE" }));
    expect(res.status).toBe(400);
  });

  it("returns race data with correct totals on success", async () => {
    mockFetch.mockReturnValueOnce(okResponse({ MRData: { RaceTable: { Races: MOCK_RACES } } }));
    const res = await GET(makeReq({ season: "2026", driverId: "max_verstappen" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.races).toHaveLength(3);
    expect(data.totals.wins).toBe(1);
    expect(data.totals.podiums).toBe(2);
    expect(data.totals.dnfs).toBe(1);
    expect(data.totals.fastestLaps).toBe(1);
    expect(data.totals.starts).toBe(3);
    expect(data.races[0].fastestLap).toBe(true);
    expect(data.races[2].position).toBeNull();
  });

  it("returns 500 when upstream throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("timeout"));
    const res = await GET(makeReq({ season: "2026", driverId: "max_verstappen" }));
    expect(res.status).toBe(500);
  });

  it("handles missing Races array gracefully", async () => {
    mockFetch.mockReturnValueOnce(okResponse({ MRData: { RaceTable: {} } }));
    const res = await GET(makeReq({ season: "2026", driverId: "max_verstappen" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.races).toHaveLength(0);
    expect(data.totals.starts).toBe(0);
    expect(data.totals.points).toBe(0);
  });

  it("handles null MRData gracefully", async () => {
    mockFetch.mockReturnValueOnce(okResponse({}));
    const res = await GET(makeReq({ season: "2026", driverId: "max_verstappen" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.races).toHaveLength(0);
  });
});
