import { describe, expect, it } from "vitest";
import { parseGrid, parsePoints, parsePosition } from "@/lib/stats/parsing";

describe("parsing helpers", () => {
  it("parses position with documented fallback", () => {
    expect(parsePosition("7")).toBe(7);
    expect(parsePosition(undefined)).toBe(99);
    expect(parsePosition("oops")).toBe(99);
  });

  it("parses points with documented fallback", () => {
    expect(parsePoints("18.5")).toBe(18.5);
    expect(parsePoints(undefined)).toBe(0);
    expect(parsePoints("oops")).toBe(0);
  });

  it("parses grid with documented fallback", () => {
    expect(parseGrid("4")).toBe(4);
    expect(parseGrid(undefined)).toBe(0);
    expect(parseGrid("oops")).toBe(0);
  });
});