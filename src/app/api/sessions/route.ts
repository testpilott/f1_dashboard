import { NextResponse } from "next/server";
import { getSessions, getSessionResult, getStints, getLaps, getPitStops, getTrackWeather, getRaceControl, getDriversForSession } from "@/lib/api/openf1";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

export const revalidate = 60;

const VALID_ENDPOINTS = new Set(["sessions", "result", "drivers", "stints", "laps", "pit", "weather", "race_control"]);
const VALID_YEAR = /^\d{4}$/;
const VALID_MEETING_KEY = /^(\d{1,8}|latest)$/;
const VALID_SESSION_KEY = /^(\d{1,8}|latest)$/;

export async function GET(req: Request) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`sessions:${ip}`, 60_000, 60)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const { searchParams } = new URL(req.url);
  const sessionKey = searchParams.get("session_key");
  const endpoint = searchParams.get("endpoint") ?? "sessions";
  const year = searchParams.get("year");
  const meetingKey = searchParams.get("meeting_key");

  if (!VALID_ENDPOINTS.has(endpoint)) {
    return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
  }
  if (year && !VALID_YEAR.test(year)) {
    return NextResponse.json({ error: "Invalid year parameter" }, { status: 400 });
  }
  if (meetingKey && !VALID_MEETING_KEY.test(meetingKey)) {
    return NextResponse.json({ error: "Invalid meeting_key parameter" }, { status: 400 });
  }
  if (sessionKey && !VALID_SESSION_KEY.test(sessionKey)) {
    return NextResponse.json({ error: "Invalid session_key parameter" }, { status: 400 });
  }

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
    console.error("[/api/sessions] Error:", err);
    return NextResponse.json({ error: "OpenF1 request failed" }, { status: 500 });
  }
}
