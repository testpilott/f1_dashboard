import { describe, expect, it, vi } from "vitest";
import { verifyChampionships } from "@/lib/api/championshipVerification";

describe("verifyChampionships", () => {
  it("short-circuits to 0 when floor is 0", async () => {
    const getSeasons = vi.fn(async () => [2025]);
    const countTitleInSeason = vi.fn(async () => 1);

    await expect(
      verifyChampionships("russell", 0, { getSeasons, countTitleInSeason }),
    ).resolves.toBe(0);
    expect(getSeasons).not.toHaveBeenCalled();
    expect(countTitleInSeason).not.toHaveBeenCalled();
  });

  it("returns observed count when it exceeds the floor", async () => {
    const getSeasons = vi.fn(async () => [2024, 2025, 2026]);
    const countTitleInSeason = vi.fn(async (_id: string, season: number) =>
      season >= 2025 ? 1 : 0,
    );

    await expect(
      verifyChampionships("norris", 1, { getSeasons, countTitleInSeason }),
    ).resolves.toBe(2);
  });

  it("returns floor when all season checks fail", async () => {
    const getSeasons = vi.fn(async () => [2008, 2014, 2015, 2017, 2018, 2019, 2020]);
    const countTitleInSeason = vi.fn(async () => 0);

    await expect(
      verifyChampionships("hamilton", 7, { getSeasons, countTitleInSeason }),
    ).resolves.toBe(7);
  });

  it("returns floor when fetching seasons throws", async () => {
    const getSeasons = vi.fn(async () => {
      throw new Error("timeout");
    });
    const countTitleInSeason = vi.fn(async () => 1);

    await expect(
      verifyChampionships("hamilton", 7, { getSeasons, countTitleInSeason }),
    ).resolves.toBe(7);
  });
});