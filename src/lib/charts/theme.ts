/**
 * Single source of truth for all chart styling (Nivo).
 * Reads design tokens from CSS so charts follow the active theme.
 *
 * Usage:
 *   import { nivoTheme, chartColors } from "@/lib/charts/theme";
 *   <ResponsiveLine theme={nivoTheme()} colors={chartColors()} ... />
 */

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function chartColors(): string[] {
  return [
    cssVar("--chart-1", "#e10600"),
    cssVar("--chart-2", "#36c5d6"),
    cssVar("--chart-3", "#f0b429"),
    cssVar("--chart-4", "#8b5cf6"),
    cssVar("--chart-5", "#84cc16"),
  ];
}

export function nivoTheme() {
  const text = cssVar("--foreground", "#fafafa");
  const grid = cssVar("--grid-line", "rgba(255,255,255,0.08)");
  const surface = cssVar("--surface-2", "#1f1f23");
  const border = cssVar("--border", "rgba(255,255,255,0.1)");
  return {
    background: "transparent",
    text: { fill: text, fontFamily: "var(--font-mono)" },
    axis: {
      ticks: { text: { fill: text, fontSize: 11 }, line: { stroke: grid } },
      legend: { text: { fill: text } },
    },
    grid: { line: { stroke: grid, strokeWidth: 1 } },
    tooltip: {
      container: {
        background: surface,
        color: text,
        border: `1px solid ${border}`,
        fontFamily: "var(--font-mono)",
        fontSize: 12,
      },
    },
  };
}
