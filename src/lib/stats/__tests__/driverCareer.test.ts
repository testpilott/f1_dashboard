import { describe, it, expect } from "vitest";
import { buildDriverCareerStats } from "../driverCareer";

describe("buildDriverCareerStats", () => {
  it("converts string totals to numbers and sums podiums", () => {
    const result = buildDriverCareerStats({
      wins: "103",
      p2: "57",
      p3: "13",
      starts: "350",
      fastestLaps: "67",
      championships: "7",
    });
    expect(result.wins).toBe(103);
    expect(result.podiums).toBe(173); // 103 + 57 + 13
    expect(result.starts).toBe(350);
    expect(result.fastestLaps).toBe(67);
    expect(result.championships).toBe(7);
  });

  it("treats missing fields as null", () => {
    const result = buildDriverCareerStats({});
    expect(result.wins).toBeNull();
    expect(result.podiums).toBeNull();
    expect(result.starts).toBeNull();
    expect(result.fastestLaps).toBeNull();
    expect(result.championships).toBeNull();
  });

  it("treats non-numeric totals as null", () => {
    const result = buildDriverCareerStats({
      wins: "N/A",
      p2: "undefined",
      p3: "",
      starts: "abc",
      fastestLaps: "null",
    });
    expect(result.wins).toBeNull();
    expect(result.podiums).toBeNull();
    expect(result.starts).toBeNull();
    expect(result.fastestLaps).toBeNull();
  });

  it("returns null podiums when any contributing total is missing", () => {
    const result = buildDriverCareerStats({ wins: "5", p2: "10" });
    expect(result.podiums).toBeNull();
  });

  it("sums podiums only when wins, p2, and p3 are all present", () => {
    const result = buildDriverCareerStats({ wins: "5", p2: "10", p3: "3" });
    expect(result.podiums).toBe(18);
  });

  it("treats non-numeric championships as unknown", () => {
    const result = buildDriverCareerStats({ championships: "n/a" });
    expect(result.championships).toBeNull();
  });
});
