import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
}));

vi.mock("@/lib/api/jolpica", () => ({
  getSeasonRaceResults: vi.fn(),
}));
vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(() => null),
}));

import { GET } from "@/app/api/driver-season/route";
import { getSeasonRaceResults } from "@/lib/api/jolpica";
import { makeApiRequest } from "@/test/api";

const mockGetRaces = getSeasonRaceResults as ReturnType<typeof vi.fn>;

const BASE_DRIVER = {
  driverId: "max_verstappen",
  permanentNumber: "1",
  code: "VER",
  url: "",
  givenName: "Max",
  familyName: "Verstappen",
  dateOfBirth: "1997-09-30",
  nationality: "Dutch",
};
const BASE_CONSTRUCTOR = { constructorId: "red_bull", url: "", name: "Red Bull Racing", nationality: "Austrian" };

const MOCK_RACES = [
  {
    season: "2026", round: "1", url: "", raceName: "Bahrain Grand Prix",
    Circuit: { circuitId: "bahrain", url: "", circuitName: "Bahrain International Circuit", Location: { lat: "0", long: "0", locality: "Sakhir", country: "Bahrain" } },
    date: "2026-03-01", time: "15:00:00Z",
    Results: [
      { number: "1", position: "1", positionText: "1", points: "25", Driver: BASE_DRIVER, Constructor: BASE_CONSTRUCTOR, grid: "1", laps: "57", status: "Finished", FastestLap: { rank: "1", lap: "50", Time: { time: "1:30.000" }, AverageSpeed: { units: "kph", speed: "220" } } },
    ],
  },
  {
    season: "2026", round: "2", url: "", raceName: "Saudi Arabian Grand Prix",
    Circuit: { circuitId: "jeddah", url: "", circuitName: "Jeddah Corniche Circuit", Location: { lat: "0", long: "0", locality: "Jeddah", country: "Saudi Arabia" } },
    date: "2026-03-08", time: "17:00:00Z",
    Results: [
      { number: "1", position: "2", positionText: "2", points: "18", Driver: BASE_DRIVER, Constructor: BASE_CONSTRUCTOR, grid: "3", laps: "50", status: "Finished" },
    ],
  },
  {
    season: "2026", round: "3", url: "", raceName: "Australian Grand Prix",
    Circuit: { circuitId: "albert_park", url: "", circuitName: "Albert Park Circuit", Location: { lat: "0", long: "0", locality: "Melbourne", country: "Australia" } },
    date: "2026-03-15", time: "06:00:00Z",
    Results: [
      { number: "1", position: "20", positionText: "R", points: "0", Driver: BASE_DRIVER, Constructor: BASE_CONSTRUCTOR, grid: "2", laps: "30", status: "Engine" },
    ],
  },
];

describe("GET /api/driver-season", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for invalid season", async () => {
    const res = await GET(makeApiRequest("/api/driver-season", { season: "bad", driverId: "max_verstappen" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid driverId (uppercase / special chars)", async () => {
    const res = await GET(makeApiRequest("/api/driver-season", { season: "2026", driverId: "INVALID DRIVER!!" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for injection attempt in driverId", async () => {
    const res = await GET(makeApiRequest("/api/driver-season", { season: "2026", driverId: "'; DROP TABLE" }));
    expect(res.status).toBe(400);
  });

  it("returns summary with correct aggregates on success", async () => {
    mockGetRaces.mockResolvedValueOnce(MOCK_RACES);
    const res = await GET(makeApiRequest("/api/driver-season", { season: "2026", driverId: "max_verstappen" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.summary).toBeDefined();
    expect(data.summary.aggregates.races).toBe(3);
    expect(data.summary.aggregates.wins).toBe(1);
    expect(data.summary.aggregates.podiums).toBe(2);
    expect(data.summary.aggregates.dnfs).toBe(1);
    expect(data.summary.aggregates.fastestLaps).toBe(1);
    expect(data.summary.aggregates.points).toBe(43);
    expect(data.summary.rows).toHaveLength(3);
  });

  it("returns 500 when upstream throws", async () => {
    mockGetRaces.mockRejectedValueOnce(new Error("timeout"));
    const res = await GET(makeApiRequest("/api/driver-season", { season: "2026", driverId: "max_verstappen" }));
    expect(res.status).toBe(500);
  });

  it("handles empty Races array gracefully", async () => {
    mockGetRaces.mockResolvedValueOnce([]);
    const res = await GET(makeApiRequest("/api/driver-season", { season: "2026", driverId: "max_verstappen" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.summary.aggregates.races).toBe(0);
    expect(data.summary.aggregates.points).toBe(0);
    expect(data.summary.rows).toHaveLength(0);
  });
});
