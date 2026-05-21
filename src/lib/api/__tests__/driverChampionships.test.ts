import { describe, expect, it } from "vitest";
import { getDriverCareerChampionships } from "@/lib/api/jolpica";

describe("getDriverCareerChampionships static map", () => {
  it("returns correct counts for known multi-time champions", async () => {
    await expect(getDriverCareerChampionships("hamilton")).resolves.toBe("7");
    await expect(getDriverCareerChampionships("michael_schumacher")).resolves.toBe("7");
    await expect(getDriverCareerChampionships("max_verstappen")).resolves.toBe("4");
    await expect(getDriverCareerChampionships("fangio")).resolves.toBe("5");
    await expect(getDriverCareerChampionships("prost")).resolves.toBe("4");
  });

  it("returns '0' for non-champion driver ids", async () => {
    await expect(getDriverCareerChampionships("norris")).resolves.toBe("0");
    await expect(getDriverCareerChampionships("leclerc")).resolves.toBe("0");
    await expect(getDriverCareerChampionships("piastri")).resolves.toBe("0");
  });

  it("returns '0' for unknown driver ids without throwing", async () => {
    await expect(getDriverCareerChampionships("not_a_real_driver_xyz")).resolves.toBe("0");
  });
});
