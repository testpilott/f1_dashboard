/**
 * Caching strategy: maps each kind of upstream data to an appropriate
 * revalidation period (seconds). Tighter TTLs are used during race weekends
 * (Fri-Sun) so live-changing data stays fresh without manual invalidation.
 *
 * Five-tier freshness model:
 *
 *   live-session  Active session telemetry (laps, positions, intervals).
 *                 Sub-minute TTL.
 *   live-meta     Things that update while a session is live but aren't
 *                 raw telemetry (standings during a race, incident
 *                 classification, results-in-progress).
 *   daily         Things that update on the order of minutes-to-hours
 *                 (news, forecast weather, recent form, bio refreshes).
 *   weekly        Things that change once per race week or less often
 *                 (career stats, driver profiles, circuit records,
 *                 projection snapshots).
 *   seasonal      Things that are static for a season or longer
 *                 (calendar, team metadata, circuit geometry).
 *
 * Legacy keys have been retired. Use the tier-style names below.
 */

export type DataClass =
  // ── TTL-preserving replacements for historical key names
  | "historicalResults"
  | "raceSchedule"
  | "sessionTelemetry"
  | "newsFeed"
  | "projectionCompute"
  | "recentForm"
  // ── live-session tier
  | "liveTelemetry"
  // ── live-meta tier
  | "liveStandings"
  | "liveResults"
  | "liveIncidents"
  // ── daily tier
  | "weather"
  | "socialBio"
  // ── weekly tier
  | "careerStats"
  | "driverProfile"
  | "circuitRecords"
  | "projectionSnapshot"
  // ── seasonal tier
  | "seasonSchedule"
  | "teams"
  | "circuitMeta";

export const REVALIDATE_5S = 5;
export const REVALIDATE_10S = 10;
export const REVALIDATE_30S = 30;
export const REVALIDATE_1M = 60;
export const REVALIDATE_2M = 120;
export const REVALIDATE_5M = 300;
export const REVALIDATE_15M = 900;
export const REVALIDATE_30M = 1800;
export const REVALIDATE_1H = 3600;
export const REVALIDATE_6H = 21600;
export const REVALIDATE_24H = 86400;
export const REVALIDATE_7D = 604800;

const BASE: Record<DataClass, number> = {
  // legacy-equivalent names with preserved TTL behavior
  historicalResults: REVALIDATE_1H,
  raceSchedule: REVALIDATE_1H,
  sessionTelemetry: REVALIDATE_1M,
  newsFeed: REVALIDATE_15M,
  projectionCompute: REVALIDATE_24H,
  recentForm: REVALIDATE_5M,
  // live-session
  liveTelemetry: REVALIDATE_10S,
  // live-meta
  liveStandings: REVALIDATE_5M,
  liveResults: REVALIDATE_5M,
  liveIncidents: REVALIDATE_5M,
  // daily
  weather: REVALIDATE_1H,
  socialBio: REVALIDATE_1H,
  // weekly
  careerStats: REVALIDATE_7D,
  driverProfile: REVALIDATE_7D,
  circuitRecords: REVALIDATE_7D,
  projectionSnapshot: REVALIDATE_7D,
  // seasonal
  seasonSchedule: REVALIDATE_24H,
  teams: REVALIDATE_24H,
  circuitMeta: REVALIDATE_24H,
};

// Race weekends (Fri–Sun): serve fresher data for live-changing fields.
const RACE_WEEKEND: Record<DataClass, number> = {
  // legacy-equivalent names with preserved TTL behavior
  historicalResults: REVALIDATE_2M,
  raceSchedule: REVALIDATE_1H,
  sessionTelemetry: REVALIDATE_30S,
  newsFeed: REVALIDATE_5M,
  projectionCompute: REVALIDATE_24H,
  recentForm: REVALIDATE_1M,
  // live-session
  liveTelemetry: REVALIDATE_5S,
  // live-meta
  liveStandings: REVALIDATE_1M,
  liveResults: REVALIDATE_1M,
  liveIncidents: REVALIDATE_1M,
  // daily
  weather: REVALIDATE_15M,
  socialBio: REVALIDATE_15M,
  // weekly — bucket flips on Mondays via currentEtWeekBucket(); race-weekend
  // TTL is the same so within-weekend reads hit the same cached row.
  careerStats: REVALIDATE_7D,
  driverProfile: REVALIDATE_7D,
  circuitRecords: REVALIDATE_7D,
  projectionSnapshot: REVALIDATE_7D,
  // seasonal
  seasonSchedule: REVALIDATE_6H,
  teams: REVALIDATE_6H,
  circuitMeta: REVALIDATE_6H,
};

/**
 * Classification of "what kind of period are we in right now?" based on
 * day-of-week. Currently a pure day-of-week heuristic so it can be called
 * synchronously from anywhere. A future refinement can consult OpenF1 to
 * detect an actively-running session and return `"live"` for sub-minute
 * TTLs. Code that needs to behave differently for live vs replay should
 * branch on this value, not on `adaptiveRevalidate` output.
 */
export type SessionPeriod = "live" | "race-weekend" | "off-week";

export function classifySessionState(now: Date = new Date()): SessionPeriod {
  const day = now.getDay();
  if (day === 0 || day === 5 || day === 6) return "race-weekend";
  return "off-week";
}

function isRaceWeekend(now: Date): boolean {
  // Local-day is intentional: matches FOM's sense of "the weekend" for the
  // primarily-European F1 audience and matches the legacy heuristic.
  const day = now.getDay();
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

/**
 * Stable cache-key suffix derived from a DataClass. Use inside `unstable_cache`
 * keys so cache rows partition cleanly by tier:
 *
 *   unstable_cache(fn, ["my-route", cacheKeySuffix("careerStats")], {
 *     revalidate: adaptiveRevalidate("careerStats"),
 *   })
 */
export function cacheKeySuffix(dataClass: DataClass): string {
  return `dc:${dataClass}`;
}
