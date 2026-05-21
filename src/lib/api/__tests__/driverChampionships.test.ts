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

  it("retries a transient season lookup failure and still returns correct count", async () => {
    const calls = new Map<string, number>();

    apiFetchMock.mockImplementation(async (path: string) => {
      calls.set(path, (calls.get(path) ?? 0) + 1);

      if (path === "/drivers/hamilton/seasons.json?limit=100") {
        return {
          MRData: {
            SeasonTable: {
              Seasons: [{ season: "2008" }, { season: "2014" }, { season: "2015" }],
            },
          },
        };
      }
      if (path === "/2008/drivers/hamilton/driverStandings/1.json?limit=1") {
        return { MRData: { total: "1" } };
      }
      if (path === "/2014/drivers/hamilton/driverStandings/1.json?limit=1") {
        if ((calls.get(path) ?? 0) === 1) {
          throw new Error("upstream timeout");
        }
        return { MRData: { total: "1" } };
      }
      if (path === "/2015/drivers/hamilton/driverStandings/1.json?limit=1") {
        return { MRData: { total: "1" } };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    await expect(getDriverCareerChampionships("hamilton")).resolves.toBe("3");
  });

  it("rejects when a season lookup still fails after retry", async () => {
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
});
