import { describe, it, expect } from "vitest";
import { chartColors, nivoTheme } from "@/lib/charts/theme";

describe("chart theme (SSR fallback path)", () => {
  it("returns 5 colors", () => {
    expect(chartColors()).toHaveLength(5);
  });
  it("first color falls back to F1 red when no DOM", () => {
    expect(chartColors()[0]).toBe("#e10600");
  });
  it("nivoTheme has axis, grid, and tooltip sections", () => {
    const t = nivoTheme();
    expect(t.axis).toBeDefined();
    expect(t.grid.line.stroke).toBeDefined();
    expect(t.tooltip.container.background).toBeDefined();
  });
});
