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

  it("returns the championship total from a single career-wide standings call", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/drivers/norris/driverStandings/1.json?limit=1") {
        return { MRData: { total: "1" } };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    await expect(getDriverCareerChampionships("norris")).resolves.toBe("1");
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns 0 when the driver has no championship-winning seasons", async () => {
    apiFetchMock.mockResolvedValue({ MRData: { total: "0" } });

    await expect(getDriverCareerChampionships("unknown_driver")).resolves.toBe("0");
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns a multi-championship total for repeat title winners", async () => {
    apiFetchMock.mockResolvedValue({ MRData: { total: "7" } });

    await expect(getDriverCareerChampionships("hamilton")).resolves.toBe("7");
  });

  it("propagates upstream errors to the caller", async () => {
    apiFetchMock.mockRejectedValue(new Error("persistent upstream timeout"));

    await expect(getDriverCareerChampionships("alonso")).rejects.toThrow(
      /persistent upstream timeout/,
    );
  });

  it("returns 0 when the API omits the total field", async () => {
    apiFetchMock.mockResolvedValue({ MRData: {} });

    await expect(getDriverCareerChampionships("ghost")).resolves.toBe("0");
  });
});
