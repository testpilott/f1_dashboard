import { NextResponse } from "next/server";
import { getSessions, getSessionResult, getStints, getLaps, getPitStops, getTrackWeather, getRaceControl, getDriversForSession } from "@/lib/api/openf1";

export const revalidate = 60;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionKey = searchParams.get("session_key");
  const endpoint = searchParams.get("endpoint") ?? "sessions";
  const year = searchParams.get("year");
  const meetingKey = searchParams.get("meeting_key");

  try {
    if (endpoint === "sessions") {
      const params: Record<string, string | number> = {};
      if (year) params.year = year;
      if (meetingKey) params.meeting_key = meetingKey;
      if (!year && !meetingKey) params.meeting_key = "latest";
      const sessions = await getSessions(params);
      return NextResponse.json({ sessions });
    }

    if (!sessionKey) {
      return NextResponse.json({ error: "session_key required" }, { status: 400 });
    }
    const key = sessionKey === "latest" ? "latest" : parseInt(sessionKey, 10);

    if (endpoint === "result") {
      const results = await getSessionResult(key);
      return NextResponse.json({ results });
    }
    if (endpoint === "drivers") {
      const drivers = await getDriversForSession(key);
      return NextResponse.json({ drivers });
    }
    if (endpoint === "stints") {
      const stints = await getStints(key as number);
      return NextResponse.json({ stints });
    }
    if (endpoint === "laps") {
      const laps = await getLaps(key as number);
      return NextResponse.json({ laps });
    }
    if (endpoint === "pit") {
      const pit = await getPitStops(key as number);
      return NextResponse.json({ pit });
    }
    if (endpoint === "weather") {
      const weather = await getTrackWeather(key as number);
      return NextResponse.json({ weather });
    }
    if (endpoint === "race_control") {
      const raceControl = await getRaceControl(key as number);
      return NextResponse.json({ raceControl });
    }

    return NextResponse.json({ error: "Unknown endpoint" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: "OpenF1 request failed", detail: String(err) },
      { status: 500 }
    );
  }
}
