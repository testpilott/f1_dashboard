"use client";

import { useEffect, useState } from "react";

export interface ProbabilityItem {
  label: string;
  /** Already clamped to [0, 100] — the % width the bar should render at. */
  value: number;
  display: string;
}

/** True on the frame after mount — lets probability bars animate 0 → width instead of popping in. */
export function useRevealOnMount(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return ready;
}

/** P10–P90 range bar with a P50 marker, shared by driver and constructor projection rows. */
export function ProjectedPointsBar({
  p10,
  p50,
  p90,
  color,
}: {
  p10: number;
  p50: number;
  p90: number;
  color: string;
}) {
  // Guard against division-by-zero when all projections are 0 or the
  // season just started and no projections exist yet.
  const p90Scaled = Math.max(p90 * 1.1, 1);

  return (
    <div
      className="relative h-2 rounded bg-surface-3 overflow-hidden cursor-help"
      title={`P10: ${Math.round(p10)} pts · P50: ${Math.round(p50)} pts · P90: ${Math.round(p90)} pts`}
    >
      {/* p10–p90 range */}
      <div
        className="absolute top-0 bottom-0 rounded opacity-30"
        style={{
          left: `${(p10 / p90Scaled) * 100}%`,
          right: `${100 - (p90 / p90Scaled) * 100}%`,
          backgroundColor: color,
        }}
      />
      {/* p50 marker */}
      <div
        className="absolute top-0 bottom-0 w-0.5 rounded"
        style={{
          left: `${(p50 / p90Scaled) * 100}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}

/** Row of labelled probability bars, shared by driver and constructor projection rows. */
export function ProbabilityGrid({
  items,
  color,
  ready,
}: {
  items: ProbabilityItem[];
  color: string;
  ready: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {items.map(({ label, value, display }) => (
        <div key={label}>
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-mono">{display}</span>
          </div>
          <div className="relative h-1.5 rounded-full bg-surface-3 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: ready ? `${value}%` : "0%",
                backgroundColor: color,
                transition: "width 0.7s ease-out",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
