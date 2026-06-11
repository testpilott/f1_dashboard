import { badRequest, gracefulDegradation, serverError, cachedJson } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_YEAR, VALID_ROUND } from "@/lib/validators";
import { getSchedule } from "@/lib/api/jolpica";
import { buildIncidentsForRace } from "@/lib/incidents/buildIncidents";

export const revalidate = 300;

export async function GET(req: Request) {
  const blocked = rateLimited(req, "race-incidents");
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const round = searchParams.get("round");

  if (!year || !round) {
    return badRequest("year and round are required");
  }
  if (!VALID_YEAR.test(year)) {
    return badRequest("Invalid year parameter");
  }
  if (!VALID_ROUND.test(round)) {
    return badRequest("Invalid round parameter");
  }

  try {
    const schedule = await getSchedule(year);
    const race = schedule.find((r) => r.round === round) ?? null;
    if (!race) {
      return gracefulDegradation("race-incidents", "Unknown race");
    }

    const result = await buildIncidentsForRace(year, round, race.Circuit.Location.country);

    if (!result.available) {
      return gracefulDegradation("race-incidents", result.reason);
    }

    return cachedJson({ available: true, incidents: result.incidents }, "liveIncidents");
  } catch (err) {
    return serverError("race-incidents", err);
  }
}
