import { badRequest, serverError, cachedJson } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_SEASON, VALID_ID } from "@/lib/validators";
import { getSeasonRaceResults } from "@/lib/api/jolpica";
import { driverSeasonSummary } from "@/lib/stats/driverSeason";
import { readSnapshotOrFetch } from "@/lib/snapshots/readSnapshotOrFetch";

export const revalidate = 604800;
// Snapshot-backed: uses fs.readFile in readSnapshotOrFetch, so this route stays on Node.
export const preferredRegion = "iad1";

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
    if (season === "current") {
      const races = await getSeasonRaceResults(season);
      const summary = driverSeasonSummary(races, driverId);
      return cachedJson(
        {
          season,
          driverId,
          summary,
          snapshotAt: new Date().toISOString(),
          source: "live",
        },
        "historicalResults"
      );
    }

    const payload = await readSnapshotOrFetch({
      key: `driver-season-${season}-${driverId}`,
      dataClass: "careerStats",
      liveFn: async () => {
        const races = await getSeasonRaceResults(season);
        const summary = driverSeasonSummary(races, driverId);
        return {
          season,
          driverId,
          summary,
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
