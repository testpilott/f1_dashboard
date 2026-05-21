import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getDriverStandings, getSchedule, getSeasonResults } from "@/lib/api/jolpica";
import { runProjections } from "@/lib/projections/montecarlo";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_SEASON } from "@/lib/validators";
import type { ChampionshipProjection } from "@/lib/types";

// Route is request-dynamic (reads req for rate-limiting), so export const revalidate
// has no effect. Real caching is handled by unstable_cache below (24h Data Cache).
export const revalidate = 86400;

// Cache the expensive pipeline once per day per season. The season arg is
// automatically included in the cache key by unstable_cache. Bump "projections-v1"
// to "projections-v2" etc. whenever the simulation logic changes and the cached
// result must be invalidated.
const getCachedProjections = unstable_cache(
  async (season: string): Promise<ChampionshipProjection> => {
    const [standings, schedule, seasonRaces] = await Promise.all([
      getDriverStandings(season),
      getSchedule(season),
      getSeasonResults(season),
    ]);

    if (!standings.length || !schedule.length) {
      throw new Error("No data available");
    }

    // Determine completed rounds from actual race result data (not date comparison).
    // A round is considered completed only if it has result entries in the API.
    const completedRounds = new Set(
      seasonRaces
        .filter((r) => Array.isArray(r.Results) && r.Results.length > 0)
        .map((r) => parseInt(r.round, 10))
    );
    const completedRound = completedRounds.size > 0 ? Math.max(...completedRounds) : 0;

    return runProjections(standings, schedule, completedRound);
  },
  ["projections-v1"],
  { revalidate: 86400, tags: ["projections"] }
);

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
    const projections = await getCachedProjections(season);
    return NextResponse.json(projections);
  } catch (err) {
    console.error("[/api/projections] Error:", err);
    return NextResponse.json({ error: "Projection failed" }, { status: 500 });
  }
}
