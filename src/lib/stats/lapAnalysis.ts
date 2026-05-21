import type { JolpicaLap, JolpicaPitstop } from "@/lib/types";
import { lapTimeToMs } from "@/lib/time/raceTime";

export interface LapSeriesPoint {
  lap: number;
  ms: number;
  driverId: string;
}

export interface PitstopMarker {
  lap: number;
  driverId: string;
  durationMs: number;
}

export function buildLapSeries(laps: JolpicaLap[], driverIds: string[]): LapSeriesPoint[] {
  const allow = new Set(driverIds);
  const out: LapSeriesPoint[] = [];

  for (const lap of laps ?? []) {
    const lapNo = parseInt(lap.number, 10);
    if (isNaN(lapNo)) continue;

    for (const timing of lap.Timings ?? []) {
      if (!allow.has(timing.driverId)) continue;
      const ms = lapTimeToMs(timing.time);
      if (isNaN(ms)) continue;
      out.push({ lap: lapNo, ms, driverId: timing.driverId });
    }
  }

  return out;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

export function summarisePace(series: LapSeriesPoint[]): { driverId: string; medianMs: number }[] {
  const grouped = new Map<string, number[]>();
  for (const p of series) {
    const arr = grouped.get(p.driverId) ?? [];
    arr.push(p.ms);
    grouped.set(p.driverId, arr);
  }

  const out: { driverId: string; medianMs: number }[] = [];
  for (const [driverId, laps] of grouped.entries()) {
    if (laps.length === 0) continue;
    const med = median(laps);
    const filtered = laps.filter((ms, i) => i !== 0 && ms <= med * 2);
    out.push({ driverId, medianMs: Math.round(median(filtered.length ? filtered : laps)) });
  }

  return out.sort((a, b) => a.medianMs - b.medianMs);
}

export function mapPitstops(pitstops: JolpicaPitstop[], driverIds: string[]): PitstopMarker[] {
  const allow = new Set(driverIds);
  const out: PitstopMarker[] = [];

  for (const p of pitstops ?? []) {
    if (!allow.has(p.driverId)) continue;
    const lap = parseInt(p.lap, 10);
    if (isNaN(lap)) continue;

    const durationSec = parseFloat(p.duration);
    const durationMs = isNaN(durationSec) ? 0 : Math.round(durationSec * 1000);
    out.push({ lap, driverId: p.driverId, durationMs });
  }

  return out;
}
