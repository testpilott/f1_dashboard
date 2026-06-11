import { describe, expect, it } from "vitest";
import { firstRace, firstRaceField, paginateMRData } from "@/lib/api/mrData";

describe("firstRaceField", () => {
  it("returns field rows when present", () => {
    const out = firstRaceField(
      { MRData: { RaceTable: { Races: [{ Results: [{ position: "1" }] }] } } },
      "Results",
    );
    expect(out).toEqual([{ position: "1" }]);
  });

  it("returns [] when race list is empty", () => {
    const out = firstRaceField(
      { MRData: { RaceTable: { Races: [] } } },
      "Results",
    );
    expect(out).toEqual([]);
  });

  it("returns [] when field is missing on first race", () => {
    const out = firstRaceField(
      { MRData: { RaceTable: { Races: [{}] } } },
      "Results",
    );
    expect(out).toEqual([]);
  });
});

describe("firstRace", () => {
  it("returns null for empty races", () => {
    expect(firstRace({ MRData: { RaceTable: { Races: [] } } })).toBeNull();
  });
});

describe("paginateMRData", () => {
  it("returns rows from a single page", async () => {
    const rows = await paginateMRData(
      async () => ({ MRData: { total: "2", offset: "0", limit: "100" }, rows: [1, 2] }),
      (page) => page.rows,
      100,
    );
    expect(rows).toEqual([1, 2]);
  });

  it("returns rows from multiple pages", async () => {
    const rows = await paginateMRData(
      async (offset) =>
        offset === 0
          ? { MRData: { total: "3", offset: "0", limit: "2" }, rows: [1, 2] }
          : { MRData: { total: "3", offset: "2", limit: "2" }, rows: [3] },
      (page) => page.rows,
      2,
    );
    expect(rows).toEqual([1, 2, 3]);
  });

  it("stops when first page is empty", async () => {
    const rows = await paginateMRData(
      async () => ({ MRData: { total: "100", offset: "0", limit: "50" }, rows: [] as number[] }),
      (page) => page.rows,
      50,
    );
    expect(rows).toEqual([]);
  });

  it("stops when total is malformed (NaN)", async () => {
    let calls = 0;
    const rows = await paginateMRData(
      async () => {
        calls += 1;
        return { MRData: { total: "oops", offset: "0", limit: "100" }, rows: [1] };
      },
      (page) => page.rows,
      100,
    );
    expect(rows).toEqual([1]);
    expect(calls).toBe(1);
  });
});