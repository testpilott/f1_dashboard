import { NextResponse } from "next/server";
import { getSessions, getSessionResult, getStints, getLaps, getPitStops, getTrackWeather, getRaceControl, getDriversForSession } from "@/lib/api/openf1";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_YEAR, VALID_MEETING_KEY, VALID_SESSION_KEY } from "@/lib/validators";

export const revalidate = 60;

// Dispatch map — TypeScript will error if a handler is missing when the key type changes.
// Keeps VALID_ENDPOINTS and handlers in sync: add one here, it's automatically valid.
type KeyedHandler = (key: number | "latest") => Promise<NextResponse>;

const KEYED_HANDLERS: Record<string, KeyedHandler> = {
  result: async (key) => {
    const results = await getSessionResult(key);
    return NextResponse.json({ results });
  },
  drivers: async (key) => {
    const drivers = await getDriversForSession(key);
    return NextResponse.json({ drivers });
  },
  stints: async (key) => {
    const stints = await getStints(key as number);
    return NextResponse.json({ stints });
  },
  laps: async (key) => {
    const laps = await getLaps(key as number);
    return NextResponse.json({ laps });
  },
  pit: async (key) => {
    const pit = await getPitStops(key as number);
    return NextResponse.json({ pit });
  },
  weather: async (key) => {
    const weather = await getTrackWeather(key as number);
    return NextResponse.json({ weather });
  },
  race_control: async (key) => {
    const raceControl = await getRaceControl(key as number);
    return NextResponse.json({ raceControl });
  },
};

// All valid endpoints — the union of "sessions" + every key in KEYED_HANDLERS.
const VALID_ENDPOINTS = new Set(["sessions", ...Object.keys(KEYED_HANDLERS)]);

export async function GET(req: Request) {
  const blocked = rateLimited(req, "sessions");
  if (blocked) return blocked;

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
    const handler = KEYED_HANDLERS[endpoint];
    return await handler(key);
  } catch (err) {
    console.error("[/api/sessions] Error:", err);
    return NextResponse.json({ error: "OpenF1 request failed" }, { status: 500 });
  }
}
