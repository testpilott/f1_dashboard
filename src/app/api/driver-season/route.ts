import { unstable_cache } from "next/cache";
import { badRequest, serverError, cachedJson } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_SEASON, VALID_ID } from "@/lib/validators";
import { getSeasonRaceResults } from "@/lib/api/jolpica";
import { driverSeasonSummary } from "@/lib/stats/driverSeason";
import { currentEtWeekBucket, WEEKLY_CACHE_REVALIDATE_SECONDS } from "@/lib/time/weeklyCache";
import { readSnapshotOrFetch } from "@/lib/snapshots/readSnapshotOrFetch";

export const revalidate = 604800;

const getCachedDriverSeason = unstable_cache(
  async (season: string, driverId: string, _unusedWeekBucket: string) => {
    void _unusedWeekBucket;
    const races = await getSeasonRaceResults(season);
    const summary = driverSeasonSummary(races, driverId);
    return { season, driverId, summary };
  },
  ["driver-season-v2-weekly"],
  { revalidate: WEEKLY_CACHE_REVALIDATE_SECONDS, tags: ["driver-season"] }
);

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
    const payload = await readSnapshotOrFetch({
      key: `driver-seasons-${driverId}`,
      dataClass: "careerStats",
      liveFn: async () => {
        const weekBucket = currentEtWeekBucket();
        const live = await getCachedDriverSeason(season, driverId, weekBucket);
        return {
          ...live,
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
