import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_SEASON, VALID_ID } from "@/lib/validators";
import { getSeasonRaceResults } from "@/lib/api/jolpica";
import { driverSeasonSummary } from "@/lib/stats/driverSeason";

export const revalidate = 3600;

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
    const races = await getSeasonRaceResults(season);
    const summary = driverSeasonSummary(races, driverId);
    return NextResponse.json({ season, driverId, summary });
  } catch (err) {
    return serverError("driver-season", err);
  }
}
