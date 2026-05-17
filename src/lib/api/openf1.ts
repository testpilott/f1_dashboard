import type {
  OpenF1Session,
  OpenF1Meeting,
  OpenF1Driver,
  OpenF1Lap,
  OpenF1Stint,
  OpenF1PitStop,
  OpenF1Position,
  OpenF1Interval,
  OpenF1SessionResult,
  OpenF1Weather,
  OpenF1RaceControl,
  OpenF1StartingGrid,
} from "@/lib/types";
import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";

const OPENF1_BASE = "https://api.openf1.org/v1";

async function openF1Fetch<T>(path: string): Promise<T> {
  const res = await fetchWithTimeout(`${OPENF1_BASE}${path}`, {
    next: { revalidate: 60 }, // cache 1 min
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`OpenF1 fetch failed: ${res.status} ${path}`);
  return res.json() as Promise<T>;
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function getSessions(params: Record<string, string | number> = {}): Promise<OpenF1Session[]> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  return openF1Fetch<OpenF1Session[]>(`/sessions${qs ? `?${qs}` : ""}`);
}

export async function getLatestMeeting(): Promise<OpenF1Meeting | null> {
  const meetings = await openF1Fetch<OpenF1Meeting[]>("/meetings?meeting_key=latest");
  return meetings[0] ?? null;
}

export async function getMeetings(year: number): Promise<OpenF1Meeting[]> {
  return openF1Fetch<OpenF1Meeting[]>(`/meetings?year=${year}`);
}

// ─── Drivers ──────────────────────────────────────────────────────────────────

export async function getDriversForSession(sessionKey: number | "latest"): Promise<OpenF1Driver[]> {
  return openF1Fetch<OpenF1Driver[]>(`/drivers?session_key=${sessionKey}`);
}

// ─── Session results ──────────────────────────────────────────────────────────

export async function getSessionResult(sessionKey: number | "latest"): Promise<OpenF1SessionResult[]> {
  return openF1Fetch<OpenF1SessionResult[]>(`/session_result?session_key=${sessionKey}`);
}

export async function getStartingGrid(sessionKey: number | "latest"): Promise<OpenF1StartingGrid[]> {
  return openF1Fetch<OpenF1StartingGrid[]>(`/starting_grid?session_key=${sessionKey}`);
}

// ─── Laps ─────────────────────────────────────────────────────────────────────

export async function getLaps(sessionKey: number, driverNumbers?: number[]): Promise<OpenF1Lap[]> {
  let path = `/laps?session_key=${sessionKey}`;
  if (driverNumbers?.length) {
    path += driverNumbers.map((n) => `&driver_number=${n}`).join("");
  }
  return openF1Fetch<OpenF1Lap[]>(path);
}

// ─── Stints ───────────────────────────────────────────────────────────────────

export async function getStints(sessionKey: number): Promise<OpenF1Stint[]> {
  return openF1Fetch<OpenF1Stint[]>(`/stints?session_key=${sessionKey}`);
}

// ─── Pit stops ────────────────────────────────────────────────────────────────

export async function getPitStops(sessionKey: number): Promise<OpenF1PitStop[]> {
  return openF1Fetch<OpenF1PitStop[]>(`/pit?session_key=${sessionKey}`);
}

// ─── Positions ────────────────────────────────────────────────────────────────

export async function getPositions(sessionKey: number): Promise<OpenF1Position[]> {
  return openF1Fetch<OpenF1Position[]>(`/position?session_key=${sessionKey}`);
}

// ─── Intervals ────────────────────────────────────────────────────────────────

export async function getIntervals(sessionKey: number): Promise<OpenF1Interval[]> {
  return openF1Fetch<OpenF1Interval[]>(`/intervals?session_key=${sessionKey}`);
}

// ─── Weather (at track) ───────────────────────────────────────────────────────

export async function getTrackWeather(sessionKey: number): Promise<OpenF1Weather[]> {
  return openF1Fetch<OpenF1Weather[]>(`/weather?session_key=${sessionKey}`);
}

// ─── Race control ─────────────────────────────────────────────────────────────

export async function getRaceControl(sessionKey: number): Promise<OpenF1RaceControl[]> {
  return openF1Fetch<OpenF1RaceControl[]>(`/race_control?session_key=${sessionKey}`);
}
