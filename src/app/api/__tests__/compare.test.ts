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

vi.mock("@/lib/api/jolpica", () => ({
  getRaceResultsAtCircuit: vi.fn(),
  getQualifyingResultsAtCircuit: vi.fn(),
  getSeasonRaceResults: vi.fn(),
  getConstructorStandings: vi.fn(),
}));

vi.mock("@/lib/stats/headToHead", () => ({
  seasonHeadToHead: vi.fn(),
}));

vi.mock("@/lib/stats/constructorH2H", () => ({
  constructorHeadToHead: vi.fn(),
}));

import { GET } from "@/app/api/compare/route";
import { makeApiRequest } from "@/test/api";
import { constructorHeadToHead } from "@/lib/stats/constructorH2H";

const MOCK_RACES = [
  {
    Results: [
      { Constructor: { constructorId: "mercedes" }, position: "1" },
      { Constructor: { constructorId: "ferrari" }, position: "2" },
    ],
  },
];
const MOCK_STANDINGS_CONSTRUCTORS = [
  { position: "1", wins: "5", Constructor: { constructorId: "mercedes" } },
  { position: "2", wins: "3", Constructor: { constructorId: "ferrari" } },
];

describe("/api/compare", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Return snapshot data keyed by the key argument
    mockReadSnapshotOrFetch.mockImplementation(({ key }: { key: string }) => {
      if (key.startsWith("standings-")) {
        return Promise.resolve({ constructors: MOCK_STANDINGS_CONSTRUCTORS, drivers: [], snapshotAt: "2026-01-01T00:00:00.000Z", source: "snapshot" });
      }
      if (key.startsWith("season-results-")) {
        return Promise.resolve({ races: MOCK_RACES, snapshotAt: "2026-01-01T00:00:00.000Z", source: "snapshot" });
      }
      return Promise.reject(new Error(`Unexpected snapshot key: ${key}`));
    });

    vi.mocked(constructorHeadToHead).mockReturnValue({
      a: { racesEntered: 1 },
      b: { racesEntered: 1 },
    } as unknown as ReturnType<typeof constructorHeadToHead>);
  });

  it("allows teams view without driverA/driverB when constructors are provided", async () => {
    const req = makeApiRequest("/api/compare", {
      view: "teams",
      constructorA: "mercedes",
      constructorB: "ferrari",
      season: "2026",
    });

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.view).toBe("teams");
    expect(body.constructorA).toBe("mercedes");
    expect(body.constructorB).toBe("ferrari");
  });

  it("still requires driverA/driverB for season view", async () => {
    const req = makeApiRequest("/api/compare", {
      view: "season",
      season: "2026",
    });

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/driverA and driverB are required/i);
  });
});