import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(() => null),
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
import {
  getSeasonRaceResults,
  getConstructorStandings,
} from "@/lib/api/jolpica";
import { constructorHeadToHead } from "@/lib/stats/constructorH2H";

describe("/api/compare", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getSeasonRaceResults).mockResolvedValue([
      {
        Results: [
          {
            Constructor: { constructorId: "mercedes" },
            position: "1",
          },
          {
            Constructor: { constructorId: "ferrari" },
            position: "2",
          },
        ],
      },
    ] as unknown as Awaited<ReturnType<typeof getSeasonRaceResults>>);

    vi.mocked(getConstructorStandings).mockResolvedValue([
      {
        position: "1",
        wins: "5",
        Constructor: { constructorId: "mercedes" },
      },
      {
        position: "2",
        wins: "3",
        Constructor: { constructorId: "ferrari" },
      },
    ] as unknown as Awaited<ReturnType<typeof getConstructorStandings>>);

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