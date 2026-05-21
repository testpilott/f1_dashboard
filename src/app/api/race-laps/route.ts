import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_YEAR, VALID_ROUND } from "@/lib/validators";
import { getRaceLaps, getRacePitstops } from "@/lib/api/jolpica";
import { buildLapSeries, mapPitstops } from "@/lib/stats/lapAnalysis";

export const revalidate = 21600;

export async function GET(req: Request) {
  const blocked = rateLimited(req, "race-laps");
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year") ?? "";
  const round = searchParams.get("round") ?? "";

  if (!VALID_YEAR.test(year)) {
    return badRequest("Invalid year parameter");
  }
  if (!VALID_ROUND.test(round)) {
    return badRequest("Invalid round parameter");
  }

  try {
    const [laps, pitstops] = await Promise.all([
      getRaceLaps(year, round),
      getRacePitstops(year, round),
    ]);

    const driverIds = Array.from(
      new Set(
        laps.flatMap((lap) => (lap.Timings ?? []).map((t) => t.driverId))
      )
    );

    const series = buildLapSeries(laps, driverIds);
    const markers = mapPitstops(pitstops, driverIds);

    return NextResponse.json({ year, round, series, pitstops: markers });
  } catch (err) {
    return serverError("race-laps", err);
  }
}
