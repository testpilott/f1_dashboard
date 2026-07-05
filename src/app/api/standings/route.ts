import { getDriverStandings, getConstructorStandings, getSeasonSprintResults } from "@/lib/api/jolpica";
import { badRequest, gracefulDegradation, cachedJson } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_SEASON } from "@/lib/validators";
import { readSnapshotOrFetch } from "@/lib/snapshots/readSnapshotOrFetch";
import { tallySprintWins, type SprintWinTallies } from "@/lib/stats/sprintWins";
import type { StandingsSnapshot } from "@/lib/snapshots/types";

export const revalidate = 300; // 5 minutes
// Snapshot-backed: uses fs.readFile in readSnapshotOrFetch, so this route stays on Node.
export const preferredRegion = "iad1";

/**
 * Optional enrichment: sprint-win tallies rendered as a secondary UI
 * element next to the official wins column. Never allowed to fail the
 * route — standings remain primary content, sprint tallies degrade to null.
 */
async function fetchSprintWins(season: string): Promise<SprintWinTallies | null> {
  try {
    return tallySprintWins(await getSeasonSprintResults(season));
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const blocked = rateLimited(req, "standings");
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season") ?? "current";

  if (!VALID_SEASON.test(season)) {
    return badRequest("Invalid season parameter");
  }

  try {
    if (season === "current") {
      const [drivers, constructors, sprintWins] = await Promise.all([
        getDriverStandings(season),
        getConstructorStandings(season),
        fetchSprintWins(season),
      ]);
      return cachedJson(
        {
          drivers,
          constructors,
          sprintWins,
          snapshotAt: new Date().toISOString(),
          source: "live",
        },
        "liveStandings",
      );
    }

    const payload = await readSnapshotOrFetch<StandingsSnapshot>({
      key: `standings-${season}`,
      dataClass: "liveStandings",
      liveFn: async () => {
        const [drivers, constructors, sprintWins] = await Promise.all([
          getDriverStandings(season),
          getConstructorStandings(season),
          fetchSprintWins(season),
        ]);
        return {
          drivers,
          constructors,
          sprintWins,
          snapshotAt: new Date().toISOString(),
          source: "live",
        };
      },
    });
    return cachedJson(payload, "liveStandings");
  } catch (err) {
    return gracefulDegradation("standings", "upstream unavailable", err, {
      drivers: [] as unknown[],
      constructors: [] as unknown[],
    });
  }
}
