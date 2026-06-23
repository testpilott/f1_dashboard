import { describe, it, expect } from "vitest";
import { chartColors, nivoTheme } from "@/lib/charts/theme";

describe("chart theme (SSR fallback path)", () => {
  it("returns 5 colors", () => {
    expect(chartColors()).toHaveLength(5);
  });
  it("first color falls back to F1 red when no DOM", () => {
    expect(chartColors()[0]).toBe("#e10600");
  });
  // Nivo reads these exact paths to colour ticks, grid lines, and the
  // tooltip popover. Bare toBeDefined() lets either path collapse to
  // empty string without flagging — pin the actual contract Nivo needs.
  it("nivoTheme returns non-empty axis tick colour, grid stroke, and tooltip colours", () => {
    const t = nivoTheme();
    expect(typeof t.axis.ticks.text.fill).toBe("string");
    expect(t.axis.ticks.text.fill.length).toBeGreaterThan(0);
    expect(typeof t.grid.line.stroke).toBe("string");
    expect(t.grid.line.stroke.length).toBeGreaterThan(0);
    expect(typeof t.tooltip.container.background).toBe("string");
    expect(t.tooltip.container.background.length).toBeGreaterThan(0);
    expect(typeof t.tooltip.container.color).toBe("string");
    expect(t.tooltip.container.color.length).toBeGreaterThan(0);
  });
});
