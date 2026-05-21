import { NextResponse } from "next/server";
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
    return NextResponse.json({ error: "Invalid season" }, { status: 400 });
  }
  if (!VALID_ID.test(driverId)) {
    return NextResponse.json({ error: "Invalid driverId" }, { status: 400 });
  }

  try {
    const races = await getSeasonRaceResults(season);
    const summary = driverSeasonSummary(races, driverId);
    return NextResponse.json({ season, driverId, summary });
  } catch (err) {
    console.error("[/api/driver-season] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch driver season data" },
      { status: 500 },
    );
  }
}
