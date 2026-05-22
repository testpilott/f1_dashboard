import { unstable_cache } from "next/cache";
import { extractFulfilled } from "@/lib/api/promiseHelpers";
import { getSessions, getRaceControl, getLocations } from "@/lib/api/openf1";
import { pickRaceSession } from "@/lib/stats/session-match";
import { classifyIncidents, closestByTime } from "@/lib/stats/incidents";
import { adaptiveRevalidate } from "@/lib/cacheStrategy";

export type BuiltIncident = {
  x: number | null;
  y: number | null;
  lap_number: number | null;
  driver_number: number | null;
  flag: string | null;
  category: string;
  message: string;
};

export type IncidentsResult =
  | { available: true; incidents: BuiltIncident[] }
  | { available: false; reason: string };

function addSeconds(iso: string, seconds: number): string {
  return new Date(new Date(iso).getTime() + seconds * 1000).toISOString();
}

/**
 * Pure-ish helper: takes a year + country (already validated upstream) and
 * returns the fully-built incident list including resolved x/y locations.
 *
 * All upstream calls are inside this function so we can wrap one cache row
 * per (year, round, country) and avoid the fan-out of getLocations() being
 * repeated on every request. See `buildIncidentsForRace` for the cached
 * variant intended for route use.
 */
export async function computeIncidentsForRace(
  year: string,
  country: string,
): Promise<IncidentsResult> {
  const sessions = await getSessions({ year: Number(year), session_type: "Race" }).catch(
    () => [],
  );
  const sessionKey = pickRaceSession(sessions, country);

  if (sessionKey == null) {
    return { available: false, reason: "OpenF1 covers 2023+ only" };
  }

  const raceControl = await getRaceControl(sessionKey);
  const incidents = classifyIncidents(raceControl);

  // For each incident, fetch a narrow ±4 s location window in parallel.
  // The per-service concurrency limiter inside createApiFetcher caps these
  // at 2 in-flight so we never burst OpenF1's rate limit.
  const locationResults = await Promise.allSettled(
    incidents.map((incident) =>
      getLocations(
        sessionKey,
        incident.driver_number!,
        addSeconds(incident.date, -4),
        addSeconds(incident.date, +4),
      ).then((samples) => closestByTime(samples, incident.date)),
    ),
  );

  const output: BuiltIncident[] = incidents.map((incident, i) => {
    const loc = extractFulfilled(locationResults[i], null);
    return {
      x: loc?.x ?? null,
      y: loc?.y ?? null,
      lap_number: incident.lap_number ?? null,
      driver_number: incident.driver_number ?? null,
      flag: incident.flag ?? null,
      category: incident.category,
      message: incident.message ?? "",
    };
  });

  return { available: true, incidents: output };
}

/**
 * Cached wrapper around `computeIncidentsForRace`. Keyed by
 * (year, round, country) so each race weekend gets one row, refreshed on
 * the liveIncidents adaptive TTL (5 m off-week, 1 m race weekend).
 *
 * Caching the *whole* computed response — rather than the individual
 * getLocations() calls inside it — keeps the cache surface small (one row
 * per race) and ensures we never re-fan-out the location requests once a
 * race is complete.
 */
export const buildIncidentsForRace = (
  year: string,
  round: string,
  country: string,
): Promise<IncidentsResult> =>
  unstable_cache(
    () => computeIncidentsForRace(year, country),
    ["race-incidents", year, round, country],
    {
      revalidate: adaptiveRevalidate("liveIncidents"),
      tags: ["race-incidents", `race-incidents:${year}-${round}`],
    },
  )();
