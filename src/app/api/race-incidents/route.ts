import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_YEAR, VALID_ROUND } from "@/lib/validators";
import { getSchedule } from "@/lib/api/jolpica";
import { getSessions, getRaceControl, getLocations } from "@/lib/api/openf1";
import { pickRaceSession } from "@/lib/stats/session-match";
import { classifyIncidents, closestByTime } from "@/lib/stats/incidents";

export const revalidate = 300;

function addSeconds(iso: string, seconds: number): string {
  return new Date(new Date(iso).getTime() + seconds * 1000).toISOString();
}

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
      return NextResponse.json({ available: false, reason: "Unknown race" });
    }

    const sessions = await getSessions({ year: Number(year), session_type: "Race" }).catch(() => []);
    const sessionKey = pickRaceSession(sessions, race.Circuit.Location.country);

    if (sessionKey == null) {
      return NextResponse.json({ available: false, reason: "OpenF1 covers 2023+ only" });
    }

    const raceControl = await getRaceControl(sessionKey);
    const incidents = classifyIncidents(raceControl);

    // For each incident, fetch a narrow ±4 s location window
    const locationResults = await Promise.allSettled(
      incidents.map((incident) =>
        getLocations(
          sessionKey,
          incident.driver_number!,
          addSeconds(incident.date, -4),
          addSeconds(incident.date, +4),
        ).then((samples) => closestByTime(samples, incident.date)),
      ),
    );

    const output = incidents.map((incident, i) => {
      const locResult = locationResults[i];
      const loc = locResult.status === "fulfilled" ? locResult.value : null;
      return {
        x: loc?.x ?? null,
        y: loc?.y ?? null,
        lap_number: incident.lap_number,
        driver_number: incident.driver_number,
        flag: incident.flag,
        category: incident.category,
        message: incident.message,
      };
    });

    return NextResponse.json({ available: true, incidents: output });
  } catch (err) {
    return serverError("race-incidents", err);
  }
}
