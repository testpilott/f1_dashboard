import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { badRequest, serverError } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_ID } from "@/lib/validators";
import {
  getDriverCareerWins,
  getDriverCareerP2,
  getDriverCareerP3,
  getDriverCareerStarts,
  getDriverCareerFastestLaps,
  getDriverCareerChampionships,
} from "@/lib/api/jolpica";
import { buildDriverCareerStats } from "@/lib/stats/driverCareer";
import { currentEtWeekBucket, WEEKLY_CACHE_REVALIDATE_SECONDS } from "@/lib/time/weeklyCache";

export const revalidate = 604800;

const getCachedDriverCareer = unstable_cache(
  async (driverId: string, _weekBucket: string) => {
    // Use Promise.all (NOT allSettled) so that any individual upstream failure
    // throws — unstable_cache won't memoize a rejection, so the next request
    // retries from scratch rather than serving sticky partial data (e.g. a
    // driver with wins populated but starts null cached for a week).
    //
    // championships is now resilient internally (floor-backed; never rejects),
    // so the only failure modes here are real Jolpica blips on the five stat
    // endpoints, which is exactly when we WANT to retry rather than cache.
    const [wins, p2, p3, starts, fastestLaps, championships] = await Promise.all([
      getDriverCareerWins(driverId),
      getDriverCareerP2(driverId),
      getDriverCareerP3(driverId),
      getDriverCareerStarts(driverId),
      getDriverCareerFastestLaps(driverId),
      getDriverCareerChampionships(driverId),
    ]);

    const career = buildDriverCareerStats({
      wins,
      p2,
      p3,
      starts,
      fastestLaps,
      championships,
    });

    return { driverId, career };
  },
  ["driver-career-v5-weekly"],
  { revalidate: WEEKLY_CACHE_REVALIDATE_SECONDS, tags: ["driver-career"] }
);

export async function GET(req: Request) {
  const blocked = rateLimited(req, "driver-career");
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const driverId = searchParams.get("driverId") ?? "";

  if (!VALID_ID.test(driverId)) {
    return badRequest("Invalid driverId");
  }

  try {
    const weekBucket = currentEtWeekBucket();
    const payload = await getCachedDriverCareer(driverId, weekBucket);
    return NextResponse.json(payload);
  } catch (err) {
    return serverError("driver-career", err);
  }
}
