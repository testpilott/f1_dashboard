import { badRequest, gracefulDegradation, cachedJson } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_YEAR, VALID_ROUND } from "@/lib/validators";
import { getSchedule } from "@/lib/api/jolpica";
import { getSessions } from "@/lib/api/openf1";
import { pickRaceSession } from "@/lib/stats/session-match";
import { getCircuitInfo } from "@/lib/api/multiviewer";
import { ensureArray } from "@/lib/utils";

// Circuit layout is static within a season — cache for 24 hours.
export const revalidate = 86400;

export async function GET(req: Request) {
  const blocked = rateLimited(req, "circuit-info");
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
    const [schedule, sessions] = await Promise.all([
      getSchedule(year),
      getSessions({ year: Number(year), session_type: "Race" }).catch(() => [] as never[]),
    ]);

    const race = schedule.find((r) => r.round === round) ?? null;
    if (!race) {
      return gracefulDegradation("circuit-info", "Race not found");
    }

    const sessionKey = pickRaceSession(sessions, race.Circuit.Location.country);
    const session = sessions.find((s) => s.session_key === sessionKey);

    if (!session?.circuit_key) {
      return gracefulDegradation(
        "circuit-info",
        "Circuit data not available from OpenF1 for this race",
      );
    }

    const info = await getCircuitInfo(session.circuit_key, Number(year));

    const corners = ensureArray<{
      number: number;
      length?: number;
      trackPosition: { x: number; y: number };
    }>(info.corners).map((c) => ({
      number: c.number,
      x: c.trackPosition.x,
      y: c.trackPosition.y,
      length: typeof c.length === "number" ? c.length : 0,
    }));

    return cachedJson({
      available: true,
      circuitName: race.Circuit.circuitName,
      country: race.Circuit.Location.country,
      locality: race.Circuit.Location.locality,
      corners,
      trackX: ensureArray<number>(info.x),
      trackY: ensureArray<number>(info.y),
      trackPositionTime: ensureArray<number>(info.trackPositionTime),
      rotation: typeof info.rotation === "number" ? info.rotation : 0,
    }, "circuitMeta");
  } catch (err) {
    return gracefulDegradation(
      "circuit-info",
      "Circuit data temporarily unavailable",
      err,
    );
  }
}
