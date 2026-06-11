import { NextResponse } from "next/server";
import { badRequest, serverError, cachedJson } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_YEAR, VALID_ROUND } from "@/lib/validators";
import { getSchedule } from "@/lib/api/jolpica";
import { getSessions, getTeamRadio, getDriversForSession } from "@/lib/api/openf1";
import { pickRaceSession } from "@/lib/stats/session-match";

export const revalidate = 300;

export async function GET(req: Request) {
  const blocked = rateLimited(req, "team-radio");
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
      return NextResponse.json({ available: false, reason: "No radio available for this race — OpenF1 covers 2023+ only" });
    }

    const [radio, drivers] = await Promise.allSettled([
      getTeamRadio(sessionKey),
      getDriversForSession(sessionKey),
    ]);

    const matched = sessions.find((s) => s.session_key === sessionKey);

    if (radio.status === "rejected") {
      return NextResponse.json({
        available: false,
        reason: "Team radio data is not yet available from OpenF1 for this session.",
      });
    }

    const clips = radio.value;
    if (clips.length === 0) {
      return NextResponse.json({
        available: true,
        sessionKey,
        sessionName: matched?.session_name ?? "Race",
        items: [],
        reason: "No radio clips were broadcast during this session.",
      });
    }

    const driverList = drivers.status === "fulfilled" ? drivers.value : [];
    const driverMap = new Map(driverList.map((d) => [d.driver_number, d]));

    const grouped = new Map<number, { date: string; recording_url: string }[]>();
    for (const clip of clips) {
      if (!grouped.has(clip.driver_number)) grouped.set(clip.driver_number, []);
      grouped.get(clip.driver_number)!.push({ date: clip.date, recording_url: clip.recording_url });
    }

    const items = [...grouped.entries()].map(([driverNumber, driverClips]) => {
      const driver = driverMap.get(driverNumber);
      return {
        driverNumber,
        acronym: driver?.name_acronym ?? `#${driverNumber}`,
        team: driver?.team_name ?? "",
        colour: driver?.team_colour ?? "",
        clips: driverClips.sort((a, b) => a.date.localeCompare(b.date)),
      };
    });

    return cachedJson({
      available: true,
      sessionKey,
      sessionName: matched?.session_name ?? "Race",
      items,
    }, "liveResults");
  } catch (err) {
    return serverError("team-radio", err);
  }
}
