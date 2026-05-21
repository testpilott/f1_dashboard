import { NextResponse } from "next/server";
import { getSchedule } from "@/lib/api/jolpica";
import { badRequest, serverError } from "@/lib/api/routeHelpers";
import {
  getSessions,
  getLaps,
  getStints,
  getDriversForSession,
} from "@/lib/api/openf1";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_YEAR, VALID_ROUND } from "@/lib/validators";
import { pickRaceSession } from "@/lib/stats/session-match";
import { stintSummaries } from "@/lib/stats/pace";

export const revalidate = 300; // 5 minutes

export async function GET(req: Request) {
  const blocked = rateLimited(req, "telemetry");
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
      return NextResponse.json({ available: false, reason: "Unknown race" });
    }

    const sessions = await getSessions({
      year: Number(year),
      session_type: "Race",
    }).catch(() => []);
    const sessionKey = pickRaceSession(sessions, race.Circuit.Location.country);

    // OpenF1 only covers 2023+; older races simply have no telemetry.
    if (sessionKey == null) {
      return NextResponse.json({
        available: false,
        reason: "No telemetry available for this race",
      });
    }

    const [laps, stints, drivers] = await Promise.all([
      getLaps(sessionKey).catch(() => []),
      getStints(sessionKey).catch(() => []),
      getDriversForSession(sessionKey).catch(() => []),
    ]);

    const result = drivers
      .map((d) => ({
        driverNumber: d.driver_number,
        acronym: d.name_acronym,
        team: d.team_name,
        colour: d.team_colour ? `#${d.team_colour.replace(/^#/, "")}` : null,
        stints: stintSummaries(laps, stints, d.driver_number),
      }))
      .filter((d) => d.stints.length > 0)
      .sort((a, b) => a.acronym.localeCompare(b.acronym));

    const matched = sessions.find((s) => s.session_key === sessionKey);

    return NextResponse.json({
      available: result.length > 0,
      race: race.raceName,
      sessionKey,
      sessionName: matched?.session_name ?? "Race",
      drivers: result,
    });
  } catch (err) {
    return serverError("telemetry", err);
  }
}
