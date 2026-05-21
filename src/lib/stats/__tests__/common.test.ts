import { describe, expect, it } from "vitest";
import { isDnf, isFinished, mean } from "@/lib/stats/common";

describe("common helpers", () => {
  it("classifies finished statuses", () => {
    expect(isFinished("Finished")).toBe(true);
    expect(isFinished("+1 Lap")).toBe(true);
    expect(isFinished("+2 Laps")).toBe(true);
    expect(isFinished("Collision")).toBe(false);
    expect(isFinished(undefined)).toBe(false);
    expect(isFinished("")).toBe(false);
  });

  it("classifies dnfs as inverse of isFinished", () => {
    expect(isDnf("Finished")).toBe(false);
    expect(isDnf("+1 Lap")).toBe(false);
    expect(isDnf("Accident")).toBe(true);
    expect(isDnf(undefined)).toBe(true);
  });

  it("computes means safely", () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
    expect(mean([])).toBe(0);
  });
});