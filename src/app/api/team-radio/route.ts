import { NextResponse } from "next/server";
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
    return NextResponse.json({ error: "year and round are required" }, { status: 400 });
  }
  if (!VALID_YEAR.test(year)) {
    return NextResponse.json({ error: "Invalid year parameter" }, { status: 400 });
  }
  if (!VALID_ROUND.test(round)) {
    return NextResponse.json({ error: "Invalid round parameter" }, { status: 400 });
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

    const clips = radio.status === "fulfilled" ? radio.value : [];
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

    const matched = sessions.find((s) => s.session_key === sessionKey);

    return NextResponse.json({
      available: true,
      sessionKey,
      sessionName: matched?.session_name ?? "Race",
      items,
    });
  } catch (err) {
    console.error("[/api/team-radio] Error:", err);
    return NextResponse.json({ error: "Failed to load team radio" }, { status: 500 });
  }
}
