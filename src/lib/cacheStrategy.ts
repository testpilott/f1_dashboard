export type DataClass =
  | "standings"
  | "schedule"
  | "telemetry"
  | "news"
  | "results"
  | "projections"
  | "form";

const BASE: Record<DataClass, number> = {
  standings: 300,
  schedule: 3600,
  telemetry: 60,
  news: 900,
  results: 3600,
  projections: 3600,
  form: 300,
};

// Race weekends (Fri–Sun): serve fresher data for live-changing fields.
const RACE_WEEKEND: Record<DataClass, number> = {
  standings: 60,
  schedule: 3600, // schedule doesn't change mid-weekend
  telemetry: 30,
  news: 300,
  results: 120,
  projections: 3600,
  form: 60,
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
