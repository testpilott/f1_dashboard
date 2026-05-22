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
  OpenF1TeamRadio,
  OpenF1Location,
} from "@/lib/types";
import { adaptiveRevalidate, type DataClass } from "@/lib/cacheStrategy";
import { createApiFetcher } from "@/lib/api/createApiFetcher";

const OPENF1_BASE = "https://api.openf1.org/v1";
const openF1Api = createApiFetcher(OPENF1_BASE, "OpenF1");

async function openF1Fetch<T>(path: string, dataClass: DataClass = "liveTelemetry"): Promise<T> {
  return openF1Api<T>(path, adaptiveRevalidate(dataClass));
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function getSessions(params: Record<string, string | number> = {}): Promise<OpenF1Session[]> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  // Session metadata (start/end times, names) is static once published.
  return openF1Fetch<OpenF1Session[]>(`/sessions${qs ? `?${qs}` : ""}`, "seasonSchedule");
}

export async function getLatestMeeting(): Promise<OpenF1Meeting | null> {
  // "latest meeting" can flip mid-week as new meetings publish; treat as seasonal.
  const meetings = await openF1Fetch<OpenF1Meeting[]>(
    "/meetings?meeting_key=latest",
    "seasonSchedule",
  );
  return meetings[0] ?? null;
}

export async function getMeetings(year: number): Promise<OpenF1Meeting[]> {
  return openF1Fetch<OpenF1Meeting[]>(`/meetings?year=${year}`, "seasonSchedule");
}

// ─── Drivers ──────────────────────────────────────────────────────────────────

export async function getDriversForSession(sessionKey: number | "latest"): Promise<OpenF1Driver[]> {
  // Driver roster per session is fixed once the session is announced.
  return openF1Fetch<OpenF1Driver[]>(`/drivers?session_key=${sessionKey}`, "teams");
}

// ─── Session results ──────────────────────────────────────────────────────────

export async function getSessionResult(sessionKey: number | "latest"): Promise<OpenF1SessionResult[]> {
  return openF1Fetch<OpenF1SessionResult[]>(`/session_result?session_key=${sessionKey}`, "liveResults");
}

export async function getStartingGrid(sessionKey: number | "latest"): Promise<OpenF1StartingGrid[]> {
  // Grid is locked once qualifying ends — treat as seasonal post-quali.
  return openF1Fetch<OpenF1StartingGrid[]>(`/starting_grid?session_key=${sessionKey}`, "liveResults");
}

// ─── Laps ─────────────────────────────────────────────────────────────────────

export async function getLaps(sessionKey: number, driverNumbers?: number[]): Promise<OpenF1Lap[]> {
  let path = `/laps?session_key=${sessionKey}`;
  if (driverNumbers?.length) {
    path += driverNumbers.map((n) => `&driver_number=${n}`).join("");
  }
  return openF1Fetch<OpenF1Lap[]>(path, "liveTelemetry");
}

// ─── Stints ───────────────────────────────────────────────────────────────────

export async function getStints(sessionKey: number): Promise<OpenF1Stint[]> {
  return openF1Fetch<OpenF1Stint[]>(`/stints?session_key=${sessionKey}`, "liveTelemetry");
}

// ─── Pit stops ────────────────────────────────────────────────────────────────

export async function getPitStops(sessionKey: number): Promise<OpenF1PitStop[]> {
  return openF1Fetch<OpenF1PitStop[]>(`/pit?session_key=${sessionKey}`, "liveTelemetry");
}

// ─── Positions ────────────────────────────────────────────────────────────────

export async function getPositions(sessionKey: number): Promise<OpenF1Position[]> {
  return openF1Fetch<OpenF1Position[]>(`/position?session_key=${sessionKey}`, "liveTelemetry");
}

// ─── Intervals ────────────────────────────────────────────────────────────────

export async function getIntervals(sessionKey: number): Promise<OpenF1Interval[]> {
  return openF1Fetch<OpenF1Interval[]>(`/intervals?session_key=${sessionKey}`, "liveTelemetry");
}

// ─── Weather (at track) ───────────────────────────────────────────────────────

export async function getTrackWeather(sessionKey: number): Promise<OpenF1Weather[]> {
  return openF1Fetch<OpenF1Weather[]>(`/weather?session_key=${sessionKey}`, "weather");
}

// ─── Race control ─────────────────────────────────────────────────────────────

export async function getRaceControl(sessionKey: number): Promise<OpenF1RaceControl[]> {
  return openF1Fetch<OpenF1RaceControl[]>(`/race_control?session_key=${sessionKey}`, "liveIncidents");
}

// ─── Team radio ───────────────────────────────────────────────────────────────

export async function getTeamRadio(sessionKey: number): Promise<OpenF1TeamRadio[]> {
  return openF1Fetch<OpenF1TeamRadio[]>(`/team_radio?session_key=${sessionKey}`, "liveTelemetry");
}

// ─── Location (narrow window only — extremely high-volume endpoint) ────────────

export async function getLocations(
  sessionKey: number,
  driverNumber: number,
  dateFrom: string,
  dateTo: string,
): Promise<OpenF1Location[]> {
  const params = new URLSearchParams({
    session_key: String(sessionKey),
    driver_number: String(driverNumber),
    "date>=": dateFrom,
    "date<=": dateTo,
  });
  return openF1Fetch<OpenF1Location[]>(`/location?${params.toString()}`, "liveTelemetry");
}
