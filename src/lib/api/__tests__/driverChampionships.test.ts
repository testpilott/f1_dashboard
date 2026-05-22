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

function seasonsResponse(years: number[]) {
  return {
    MRData: {
      SeasonTable: {
        Seasons: years.map((y) => ({ season: String(y) })),
      },
    },
  };
}

describe("getDriverCareerChampionships", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("short-circuits to 0 for drivers not on the closed champions list (no network call)", async () => {
    await expect(getDriverCareerChampionships("sainz")).resolves.toBe("0");
    await expect(getDriverCareerChampionships("russell")).resolves.toBe("0");
    await expect(getDriverCareerChampionships("totally_unknown_driver")).resolves.toBe("0");
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("counts titles by checking every season the driver competed in", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/drivers/norris/seasons.json?limit=100") {
        return seasonsResponse([2019, 2020, 2021, 2022, 2023, 2024, 2025]);
      }
      if (path === "/2025/drivers/norris/driverStandings/1.json?limit=1") {
        return { MRData: { total: "1" } };
      }
      return { MRData: { total: "0" } };
    });

    await expect(getDriverCareerChampionships("norris")).resolves.toBe("1");
  });

  it("uses the known-champion floor when observed count is lower (partial upstream failure)", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/drivers/hamilton/seasons.json?limit=100") {
        return seasonsResponse([2007, 2008, 2014, 2015, 2017, 2018, 2019, 2020]);
      }
      return { MRData: { total: "0" } };
    });

    await expect(getDriverCareerChampionships("hamilton")).resolves.toBe("7");
  });

  it("tolerates per-season rejections by treating them as no-title and applying the floor", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/drivers/hamilton/seasons.json?limit=100") {
        return seasonsResponse([2008, 2014, 2015, 2017, 2018, 2019, 2020]);
      }
      throw new Error("upstream timeout");
    });

    await expect(getDriverCareerChampionships("hamilton")).resolves.toBe("7");
  });

  it("falls back to the floor when the seasons-list call itself rejects", async () => {
    apiFetchMock.mockRejectedValue(new Error("persistent upstream timeout"));

    await expect(getDriverCareerChampionships("hamilton")).resolves.toBe("7");
  });

  it("never throws for drivers without a known floor (short-circuit returns 0)", async () => {
    apiFetchMock.mockRejectedValue(new Error("persistent upstream timeout"));

    await expect(getDriverCareerChampionships("russell")).resolves.toBe("0");
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("returns the floor when the driver has competed in zero seasons", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/drivers/hamilton/seasons.json?limit=100") {
        return seasonsResponse([]);
      }
      return { MRData: { total: "0" } };
    });

    await expect(getDriverCareerChampionships("hamilton")).resolves.toBe("7");
  });

  it("returns the higher of observed and floor when observed exceeds it", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/drivers/norris/seasons.json?limit=100") {
        return seasonsResponse([2019, 2020, 2025, 2026]);
      }
      if (path === "/2025/drivers/norris/driverStandings/1.json?limit=1") {
        return { MRData: { total: "1" } };
      }
      if (path === "/2026/drivers/norris/driverStandings/1.json?limit=1") {
        return { MRData: { total: "1" } };
      }
      return { MRData: { total: "0" } };
    });

    await expect(getDriverCareerChampionships("norris")).resolves.toBe("2");
  });

  it("limits per-season concurrency to avoid upstream rate limits", async () => {
    let inFlight = 0;
    let peakInFlight = 0;

    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/drivers/alonso/seasons.json?limit=100") {
        return seasonsResponse(Array.from({ length: 20 }, (_, i) => 2001 + i));
      }

      inFlight++;
      peakInFlight = Math.max(peakInFlight, inFlight);
      await Promise.resolve();
      inFlight--;
      return { MRData: { total: "0" } };
    });

    // Alonso's floor is 2 — clamped even though every season reads 0.
    await expect(getDriverCareerChampionships("alonso")).resolves.toBe("2");
    expect(peakInFlight).toBeGreaterThan(0);
    expect(peakInFlight).toBeLessThanOrEqual(4);
  });
});
