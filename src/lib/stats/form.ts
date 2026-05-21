/**
 * Driver "form" — a rolling read of recent-race momentum derived purely from
 * Jolpica/Ergast race results. No external calls; safe to unit-test in isolation.
 */
import type { Race } from "@/lib/types";
import { isFinished, mean } from "@/lib/stats/common";
import { parsePoints } from "@/lib/stats/parsing";

export type FormTrend = "up" | "down" | "flat";

export interface DriverForm {
  /** Number of recent races the driver actually appeared in (≤ window). */
  races: number;
  /** Mean championship points across those races. */
  avgPoints: number;
  /** Podiums (finish position 1–3) ÷ races, in [0, 1]. */
  podiumRatio: number;
  /** Races classified as finished (status "Finished" or "+N Lap(s)"). */
  finishes: number;
  /** Direction of travel comparing the earlier vs later half of the window. */
  trend: FormTrend;
}

const EMPTY: DriverForm = {
  races: 0,
  avgPoints: 0,
  podiumRatio: 0,
  finishes: 0,
  trend: "flat",
};

/**
 * Compute a driver's recent form over the last `window` rounds.
 *
 * Races are sorted by round; only the most recent `window` are considered, and
 * only those in which the driver has a result count toward `races`. Unknown
 * drivers / empty input yield a neutral, zeroed result (never throws).
 */
export function calculateDriverForm(
  races: Race[],
  driverId: string,
  window = 5,
): DriverForm {
  if (!Array.isArray(races) || races.length === 0 || !driverId || window <= 0) {
    return { ...EMPTY };
  }

  const recent = [...races]
    .sort((a, b) => Number(a.round) - Number(b.round))
    .slice(-window);

  const points: number[] = [];
  let podiums = 0;
  let finishes = 0;

  for (const race of recent) {
    const result = race.Results?.find((r) => r.Driver?.driverId === driverId);
    if (!result) continue;

    points.push(parsePoints(result.points));

    const pos = parseInt(result.position, 10);
    if (pos >= 1 && pos <= 3) podiums += 1;
    if (isFinished(result.status)) finishes += 1;
  }

  const n = points.length;
  if (n === 0) return { ...EMPTY };

  let trend: FormTrend = "flat";
  if (n >= 2) {
    const mid = Math.floor(n / 2);
    const delta = mean(points.slice(mid)) - mean(points.slice(0, mid));
    if (delta > 0.5) trend = "up";
    else if (delta < -0.5) trend = "down";
  }

  return {
    races: n,
    avgPoints: mean(points),
    podiumRatio: podiums / n,
    finishes,
    trend,
  };
}
