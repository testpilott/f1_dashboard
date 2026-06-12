import { badRequest, serverError, cachedJson } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_SEASON, VALID_ID } from "@/lib/validators";
import { getSeasonRaceResults, getSchedule } from "@/lib/api/jolpica";
import { driverSeasonSummary } from "@/lib/stats/driverSeason";
import { readSnapshotOrFetch } from "@/lib/snapshots/readSnapshotOrFetch";
import type { Race } from "@/lib/types";

export const revalidate = 604800;
// Snapshot-backed: uses fs.readFile in readSnapshotOrFetch, so this route stays on Node.
export const preferredRegion = "iad1";

const RESULTS_FEED_RECHECK_MS = 24 * 60 * 60 * 1000;

function raceTimestampMs(race: Race): number {
  // Jolpica dates are UTC dates; include time when present to avoid
  // marking a same-day race as completed too early.
  const iso = race.time ? `${race.date}T${race.time}` : `${race.date}T00:00:00Z`;
  const ts = Date.parse(iso);
  return Number.isNaN(ts) ? Number.POSITIVE_INFINITY : ts;
}

export async function GET(req: Request) {
  const blocked = rateLimited(req, "driver-season");
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season") ?? "current";
  const driverId = searchParams.get("driverId") ?? "";

  if (!VALID_SEASON.test(season)) {
    return badRequest("Invalid season");
  }
  if (!VALID_ID.test(driverId)) {
    return badRequest("Invalid driverId");
  }

  try {
    if (season === "current") {
      const [races, schedule] = await Promise.all([
        getSeasonRaceResults(season),
        getSchedule(season),
      ]);
      const summary = driverSeasonSummary(races, driverId);

      const now = Date.now();
      const publishedRounds = new Set(
        races
          .map((r) => parseInt(r.round, 10))
          .filter((round) => Number.isFinite(round)),
      );

      const pendingScheduleRaces = schedule
        .filter((r) => raceTimestampMs(r) <= now)
        .filter((r) => {
          const round = parseInt(r.round, 10);
          return Number.isFinite(round) && !publishedRounds.has(round);
        })
        .sort((a, b) => parseInt(a.round, 10) - parseInt(b.round, 10));

      const resultsFeedLag = pendingScheduleRaces.length > 0
        ? {
            pendingRaceNames: pendingScheduleRaces.map((r) => r.raceName),
            pendingRounds: pendingScheduleRaces
              .map((r) => parseInt(r.round, 10))
              .filter((round) => Number.isFinite(round)),
            checkAgainAfterMs: RESULTS_FEED_RECHECK_MS,
            asOf: new Date().toISOString(),
          }
        : null;

      return cachedJson(
        {
          season,
          driverId,
          summary,
          resultsFeedLag,
          snapshotAt: new Date().toISOString(),
          source: "live",
        },
        "liveResults"
      );
    }

    const payload = await readSnapshotOrFetch({
      key: `driver-season-${season}-${driverId}`,
      dataClass: "careerStats",
      liveFn: async () => {
        const races = await getSeasonRaceResults(season);
        const summary = driverSeasonSummary(races, driverId);
        return {
          season,
          driverId,
          summary,
          snapshotAt: new Date().toISOString(),
          source: "live",
        };
      },
    });
    return cachedJson(payload, "careerStats");
  } catch (err) {
    return serverError("driver-season", err);
  }
}
