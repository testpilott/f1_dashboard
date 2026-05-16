import { NextResponse } from "next/server";
import { getDriverStandings, getSchedule, getSeasonResults } from "@/lib/api/jolpica";
import { runProjections } from "@/lib/projections/montecarlo";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_SEASON } from "@/lib/validators";

export const revalidate = 3600; // 1 hour

export async function GET(req: Request) {
  // Stricter limit — projections run 10k Monte Carlo simulations
  const blocked = rateLimited(req, "projections", { max: 10 });
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season") ?? "current";

  if (!VALID_SEASON.test(season)) {
    return NextResponse.json({ error: "Invalid season parameter" }, { status: 400 });
  }
  if (season !== "current") {
    const yr = parseInt(season, 10);
    if (yr < 2000 || yr > 2030) {
      return NextResponse.json({ error: "Season out of range" }, { status: 400 });
    }
  }

  try {
    const [standings, schedule, seasonRaces] = await Promise.all([
      getDriverStandings(season),
      getSchedule(season),
      getSeasonResults(season),
    ]);

    if (!standings.length || !schedule.length) {
      return NextResponse.json({ error: "No data available" }, { status: 404 });
    }

    // Determine completed rounds from actual race result data (not date comparison).
    // A round is considered completed only if it has result entries in the API.
    const completedRoundsFromResults = new Set(
      seasonRaces
        .filter((r) => Array.isArray(r.Results) && r.Results.length > 0)
        .map((r) => parseInt(r.round, 10))
    );
    const completedRound = completedRoundsFromResults.size > 0
      ? Math.max(...completedRoundsFromResults)
      : 0;

    const projections = runProjections(standings, schedule, completedRound);
    return NextResponse.json(projections);
  } catch (err) {
    console.error("[/api/projections] Error:", err);
    return NextResponse.json(
      { error: "Projection failed" },
      { status: 500 }
    );
  }
}
