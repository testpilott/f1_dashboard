import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock("@/lib/cacheStrategy", () => ({
  adaptiveRevalidate: vi.fn(() => 60),
}));

vi.mock("@/lib/api/createApiFetcher", () => ({
  createApiFetcher: vi.fn(() => apiFetchMock),
}));

import { getDriverCareerChampionships } from "@/lib/api/jolpica";

describe("getDriverCareerChampionships", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("counts titles by checking every season the driver competed in", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/drivers/norris/seasons.json?limit=100") {
        return {
          MRData: {
            SeasonTable: {
              Seasons: [{ season: "2023" }, { season: "2024" }, { season: "2025" }],
            },
          },
        };
      }
      if (path === "/2023/drivers/norris/driverStandings/1.json?limit=1") {
        return { MRData: { total: "0" } };
      }
      if (path === "/2024/drivers/norris/driverStandings/1.json?limit=1") {
        return { MRData: { total: "0" } };
      }
      if (path === "/2025/drivers/norris/driverStandings/1.json?limit=1") {
        return { MRData: { total: "1" } };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    await expect(getDriverCareerChampionships("norris")).resolves.toBe("1");
  });

  it("returns 0 when no season data is available", async () => {
    apiFetchMock.mockResolvedValue({
      MRData: { SeasonTable: { Seasons: [] } },
    });

    await expect(getDriverCareerChampionships("unknown_driver")).resolves.toBe("0");
  });

  it("propagates a season lookup failure to the caller", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/drivers/hamilton/seasons.json?limit=100") {
        return {
          MRData: {
            SeasonTable: {
              Seasons: [{ season: "2008" }, { season: "2014" }],
            },
          },
        };
      }
      if (path === "/2008/drivers/hamilton/driverStandings/1.json?limit=1") {
        return { MRData: { total: "1" } };
      }
      if (path === "/2014/drivers/hamilton/driverStandings/1.json?limit=1") {
        throw new Error("persistent upstream timeout");
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    await expect(getDriverCareerChampionships("hamilton")).rejects.toThrow(
      /persistent upstream timeout/
    );
  });

  it("limits per-season concurrency to avoid upstream rate limits", async () => {
    let inFlight = 0;
    let peakInFlight = 0;

    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/drivers/alonso/seasons.json?limit=100") {
        const seasons = Array.from({ length: 20 }, (_, i) => ({
          season: String(2001 + i),
        }));
        return { MRData: { SeasonTable: { Seasons: seasons } } };
      }

      inFlight++;
      peakInFlight = Math.max(peakInFlight, inFlight);
      // Yield a microtask so concurrent calls overlap.
      await Promise.resolve();
      inFlight--;
      return { MRData: { total: "0" } };
    });

    await expect(getDriverCareerChampionships("alonso")).resolves.toBe("0");
    expect(peakInFlight).toBeGreaterThan(0);
    expect(peakInFlight).toBeLessThanOrEqual(4);
  });
});
