import { NextResponse } from "next/server";
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

export const revalidate = 86400;

export async function GET(req: Request) {
  const blocked = rateLimited(req, "driver-career");
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const driverId = searchParams.get("driverId") ?? "";

  if (!VALID_ID.test(driverId)) {
    return badRequest("Invalid driverId");
  }

  try {
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

    return NextResponse.json({ driverId, career });
  } catch (err) {
    return serverError("driver-career", err);
  }
}
