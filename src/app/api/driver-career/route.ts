import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { badRequest, serverError } from "@/lib/api/routeHelpers";
import { extractFulfilled } from "@/lib/api/promiseHelpers";
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
    const [wins, p2, p3, starts, fastestLaps, championships] = await Promise.allSettled([
      getDriverCareerWins(driverId),
      getDriverCareerP2(driverId),
      getDriverCareerP3(driverId),
      getDriverCareerStarts(driverId),
      getDriverCareerFastestLaps(driverId),
      getDriverCareerChampionships(driverId),
    ]);

    const career = buildDriverCareerStats({
      wins: extractFulfilled(wins, undefined),
      p2: extractFulfilled(p2, undefined),
      p3: extractFulfilled(p3, undefined),
      starts: extractFulfilled(starts, undefined),
      fastestLaps: extractFulfilled(fastestLaps, undefined),
      championships: extractFulfilled(championships, undefined),
    });

    return { driverId, career };
  },
  ["driver-career-v3-weekly"],
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
