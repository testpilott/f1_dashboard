export type DataClass =
  | "standings"
  | "schedule"
  | "telemetry"
  | "news"
  | "results"
  | "projections"
  | "form";

export const REVALIDATE_30S = 30;
export const REVALIDATE_1M = 60;
export const REVALIDATE_2M = 120;
export const REVALIDATE_5M = 300;
export const REVALIDATE_15M = 900;
export const REVALIDATE_1H = 3600;
export const REVALIDATE_6H = 21600;
export const REVALIDATE_24H = 86400;

const BASE: Record<DataClass, number> = {
  standings: REVALIDATE_5M,
  schedule: REVALIDATE_1H,
  telemetry: REVALIDATE_1M,
  news: REVALIDATE_15M,
  results: REVALIDATE_1H,
  projections: REVALIDATE_24H,
  form: REVALIDATE_5M,
};

// Race weekends (Fri–Sun): serve fresher data for live-changing fields.
const RACE_WEEKEND: Record<DataClass, number> = {
  standings: REVALIDATE_1M,
  schedule: REVALIDATE_1H, // schedule doesn't change mid-weekend
  telemetry: REVALIDATE_30S,
  news: REVALIDATE_5M,
  results: REVALIDATE_2M,
  projections: REVALIDATE_24H,
  form: REVALIDATE_1M,
};

function isRaceWeekend(now: Date): boolean {
  const day = now.getDay(); // 0=Sun, 5=Fri, 6=Sat
  return day === 0 || day === 5 || day === 6;
}

/**
 * Returns the recommended ISR/fetch revalidate period (seconds) for the given
 * data class. On Fri/Sat/Sun (race weekend heuristic) tighter TTLs are used
 * for live-changing data so the UI stays fresh without manual invalidation.
 */
export function adaptiveRevalidate(dataClass: DataClass, now = new Date()): number {
  return isRaceWeekend(now) ? RACE_WEEKEND[dataClass] : BASE[dataClass];
}
