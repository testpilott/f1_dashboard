import type { OpenF1RaceControl, OpenF1Location } from "@/lib/types";

// ─── Classify incidents ───────────────────────────────────────────────────────

/**
 * Verified against 2023+ race_control payloads (sessions 7953, 9126).
 * Categories and flags in the real API:
 *   "CarEvent" — off-track, contact, accident; always has driver_number
 *   "Flag"+"YELLOW" / "DOUBLE YELLOW" / "RED" — yellow/red conditions
 *   "SafetyCar" — safety car / VSC deployment
 *   "Drs", "Flag"+"CLEAR"/"GREEN"/"BLUE"/"CHEQUERED"/"BLACK AND WHITE",
 *   "Other", "SessionStatus" — routine; excluded
 *
 * We require driver_number to be non-null so we can look up the location.
 */
export function classifyIncidents(
  raceControl: OpenF1RaceControl[],
): OpenF1RaceControl[] {
  return raceControl.filter((entry) => {
    if (entry.driver_number == null) return false;
    const { category, flag } = entry;
    if (category === "CarEvent") return true;
    if (category === "SafetyCar") return true;
    if (category === "Flag") {
      const f = flag?.toUpperCase() ?? "";
      return f === "YELLOW" || f === "DOUBLE YELLOW" || f === "RED";
    }
    return false;
  });
}

// ─── Closest sample by time ───────────────────────────────────────────────────

export function closestByTime(
  samples: OpenF1Location[],
  targetIso: string,
): OpenF1Location | null {
  if (samples.length === 0) return null;
  const targetMs = new Date(targetIso).getTime();
  let closest = samples[0];
  let minDiff = Math.abs(new Date(samples[0].date).getTime() - targetMs);
  for (let i = 1; i < samples.length; i++) {
    const diff = Math.abs(new Date(samples[i].date).getTime() - targetMs);
    if (diff < minDiff) {
      minDiff = diff;
      closest = samples[i];
    }
  }
  return closest;
}

// ─── Nearest polyline point ───────────────────────────────────────────────────

export function nearestPolylinePoint(
  xs: number[],
  ys: number[],
  px: number,
  py: number,
): { x: number; y: number } {
  if (xs.length === 0) return { x: px, y: py };
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - px;
    const dy = ys[i] - py;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return { x: xs[bestIdx], y: ys[bestIdx] };
}

// ─── Parse corner number ──────────────────────────────────────────────────────

export function parseCornerNumber(message: string): number | null {
  const match = /\bTurn\s+(\d+)\b/i.exec(message);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return Number.isFinite(n) ? n : null;
}
