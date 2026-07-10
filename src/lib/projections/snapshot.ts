import { unstable_cache, revalidateTag } from "next/cache";
import {
  getDriverStandings,
  getConstructorStandings,
  getSchedule,
  getSeasonResultsFirstPage,
} from "@/lib/api/jolpica";
import { runProjections } from "@/lib/projections/montecarlo";
import type { ChampionshipProjection } from "@/lib/types";

/**
 * Snapshot module for the championship projections pipeline.
 *
 * The Monte Carlo run is expensive (10k iterations). To keep it off user
 * requests:
 *
 *   1. `computeProjections(season)` — pure pipeline, no caching.
 *   2. `getCachedProjections(season)` — wraps the pipeline in `unstable_cache`
 *      so the result lives in the shared Vercel Data Cache for 24h. Every
 *      lambda instance reads from the same store.
 *   3. `/api/projections` calls `getCachedProjections` directly. The cache is
 *      the single source of truth; there is no instance-local warm flag
 *      (that approach was broken because each lambda instance has its own
 *      memory and only one is ever warmed by the cron).
 *   4. `/api/projections/snapshot` (cron-guarded) calls `warmSnapshot(season)`
 *      to invalidate the cached value and recompute, so the first user after
 *      a deploy / TTL expiry does not pay the compute cost.
 *
 * Bump the cache-key suffix (e.g. "v1" → "v2") whenever the projection
 * algorithm changes and stored results must be invalidated.
 */

const PROJECTIONS_CACHE_KEY = ["projections", "v2"] as const;
export const PROJECTIONS_CACHE_TAG = "projections";
const PROJECTIONS_REVALIDATE_SECONDS = 86400; // 24h — cron refresh interval

/**
 * Pure projection pipeline. Reads upstream sources once and runs the simulation.
 * Throws if upstream data is empty.
 */
export async function computeProjections(season: string): Promise<ChampionshipProjection> {
  const [standings, constructorStandings, schedule, seasonRaces] = await Promise.all([
    getDriverStandings(season),
    getConstructorStandings(season),
    getSchedule(season),
    getSeasonResultsFirstPage(season),
  ]);

  if (!standings.length || !schedule.length) {
    throw new Error("No data available");
  }

  const completedRounds = new Set(
    seasonRaces
      .filter((r) => Array.isArray(r.Results) && r.Results.length > 0)
      .map((r) => parseInt(r.round, 10)),
  );
  const completedRound = completedRounds.size > 0 ? Math.max(...completedRounds) : 0;

  return runProjections(standings, constructorStandings, schedule, completedRound);
}

export const getCachedProjections = unstable_cache(
  (season: string) => computeProjections(season),
  PROJECTIONS_CACHE_KEY as unknown as string[],
  { revalidate: PROJECTIONS_REVALIDATE_SECONDS, tags: [PROJECTIONS_CACHE_TAG] },
);

/**
 * Cron entry point. Invalidates the previously-cached projection, recomputes,
 * and stores the new value via `getCachedProjections`.
 *
 * Returns the freshly computed projection so the cron route can log basic info.
 */
export async function warmSnapshot(season: string): Promise<ChampionshipProjection> {
  // Invalidate any previously cached value so the next call recomputes.
  // Next.js 16 requires a profile argument; "max" yields stale-while-revalidate
  // semantics on subsequent reads.
  revalidateTag(PROJECTIONS_CACHE_TAG, "max");
  return getCachedProjections(season);
}
