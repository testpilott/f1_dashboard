import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
}));

vi.mock("@/lib/api/jolpica", async () => {
  const { createJolpicaMocks } = await import("@/test/mockJolpica");
  return createJolpicaMocks();
});
vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(() => null),
}));
vi.mock("@/lib/snapshots/readSnapshotOrFetch", () => ({
  readSnapshotOrFetch: vi.fn(async ({ liveFn }: { liveFn: () => Promise<unknown> }) => liveFn()),
}));

import { GET } from "@/app/api/driver-season/route";
import { getSeasonResultsAllPages, getSchedule } from "@/lib/api/jolpica";
import { readSnapshotOrFetch } from "@/lib/snapshots/readSnapshotOrFetch";
import { rateLimited } from "@/lib/api/withRateLimit";
import { edgeCacheControl } from "@/lib/api/edgeHeaders";
import { makeApiRequest } from "@/test/api";

const mockGetRaces = getSeasonResultsAllPages as ReturnType<typeof vi.fn>;
const mockGetSchedule = getSchedule as ReturnType<typeof vi.fn>;
const mockReadSnapshotOrFetch = readSnapshotOrFetch as ReturnType<typeof vi.fn>;
const mockRateLimited = rateLimited as ReturnType<typeof vi.fn>;

const PENDING_RACE = {
  season: "2026", round: "4", url: "", raceName: "Monaco Grand Prix",
  Circuit: { circuitId: "monaco", url: "", circuitName: "Circuit de Monaco", Location: { lat: "0", long: "0", locality: "Monte Carlo", country: "Monaco" } },
  date: "2026-03-09", time: "09:00:00Z",
};

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

  it("bypasses snapshot reads for current season freshness", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-09T12:00:00.000Z"));
    mockGetRaces.mockResolvedValueOnce(MOCK_RACES);
    mockGetSchedule.mockResolvedValueOnce([
      ...MOCK_RACES,
      {
        season: "2026", round: "4", url: "", raceName: "Monaco Grand Prix",
        Circuit: { circuitId: "monaco", url: "", circuitName: "Circuit de Monaco", Location: { lat: "0", long: "0", locality: "Monte Carlo", country: "Monaco" } },
        date: "2026-03-09", time: "09:00:00Z",
      },
    ]);
    const res = await GET(makeApiRequest("/api/driver-season", { season: "current", driverId: "max_verstappen" }));
    expect(res.status).toBe(200);
    expect(mockReadSnapshotOrFetch).not.toHaveBeenCalled();
    expect(res.headers.get("cache-control")).toBe(edgeCacheControl("liveResults"));
    const data = await res.json();
    expect(data.resultsFeedLag).toBeTruthy();
    expect(data.resultsFeedLag.pendingRaceNames).toContain("Monaco Grand Prix");
    expect(data.resultsFeedLag.checkAgainAfterMs).toBe(15 * 60 * 1000);
    vi.useRealTimers();
  });

  it("uses the 10-minute recheck window during a race weekend", async () => {
    vi.useFakeTimers();
    // 2026-03-14 is a Saturday in every timezone at noon UTC.
    vi.setSystemTime(new Date("2026-03-14T12:00:00.000Z"));
    mockGetRaces.mockResolvedValueOnce(MOCK_RACES);
    mockGetSchedule.mockResolvedValueOnce([...MOCK_RACES, PENDING_RACE]);

    const res = await GET(makeApiRequest("/api/driver-season", { season: "current", driverId: "max_verstappen" }));
    const data = await res.json();

    expect(data.resultsFeedLag.checkAgainAfterMs).toBe(10 * 60 * 1000);
    vi.useRealTimers();
  });

  it("uses the 60-minute off-week window when the pending race is stale", async () => {
    vi.useFakeTimers();
    // Monday, well over 12h after the pending race date.
    vi.setSystemTime(new Date("2026-03-30T12:00:00.000Z"));
    mockGetRaces.mockResolvedValueOnce(MOCK_RACES);
    mockGetSchedule.mockResolvedValueOnce([
      ...MOCK_RACES,
      { ...PENDING_RACE, date: "2026-03-09", time: "09:00:00Z" },
    ]);

    const res = await GET(makeApiRequest("/api/driver-season", { season: "current", driverId: "max_verstappen" }));
    const data = await res.json();

    expect(data.resultsFeedLag.checkAgainAfterMs).toBe(60 * 60 * 1000);
    vi.useRealTimers();
  });

  it("reports no results-feed lag when every scheduled race is published", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-20T12:00:00.000Z"));
    mockGetRaces.mockResolvedValueOnce(MOCK_RACES);
    mockGetSchedule.mockResolvedValueOnce(MOCK_RACES);

    const res = await GET(makeApiRequest("/api/driver-season", { season: "current", driverId: "max_verstappen" }));
    const data = await res.json();

    expect(data.resultsFeedLag).toBeNull();
    vi.useRealTimers();
  });

  it("reads a snapshot (careerStats tier) for a historical season", async () => {
    mockGetRaces.mockResolvedValueOnce(MOCK_RACES);

    const res = await GET(makeApiRequest("/api/driver-season", { season: "2024", driverId: "max_verstappen" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockReadSnapshotOrFetch).toHaveBeenCalledWith(
      expect.objectContaining({ key: "driver-season-2024-max_verstappen", dataClass: "careerStats" }),
    );
    expect(res.headers.get("cache-control")).toBe(edgeCacheControl("careerStats"));
    expect(data.source).toBe("live");
  });

  it("short-circuits with the rate-limit response when throttled", async () => {
    mockRateLimited.mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }),
    );

    const res = await GET(makeApiRequest("/api/driver-season", { season: "current", driverId: "max_verstappen" }));

    expect(res.status).toBe(429);
    expect(mockGetRaces).not.toHaveBeenCalled();
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
