import { getRaceResults, getQualifyingResults, getSprintResults } from "@/lib/api/jolpica";
import { badRequest, serverError, cachedJson } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_SEASON, VALID_ROUND, VALID_TYPE } from "@/lib/validators";

export const revalidate = 3600;
// Snapshot-backed: uses fs.readFile in readSnapshotOrFetch, so this route stays on Node.
export const preferredRegion = "iad1";

export async function GET(req: Request) {
  const blocked = rateLimited(req, "results");
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season");
  const round = searchParams.get("round");
  const type = searchParams.get("type") ?? "race";

  if (!season || !round) {
    return badRequest("season and round are required");
  }
  if (!VALID_SEASON.test(season)) {
    return badRequest("Invalid season parameter");
  }
  if (!VALID_ROUND.test(round)) {
    return badRequest("Invalid round parameter");
  }
  if (!VALID_TYPE.has(type)) {
    return badRequest("Invalid type parameter");
  }

  try {
    if (type === "qualifying") {
      const results = await getQualifyingResults(season, round);
      return cachedJson({ results }, "historicalResults");
    }
    if (type === "sprint") {
      const results = await getSprintResults(season, round);
      return cachedJson({ results }, "historicalResults");
    }
    const results = await getRaceResults(season, round);
    return cachedJson({ results }, "historicalResults");
  } catch (err) {
    return serverError("results", err);
  }
}
