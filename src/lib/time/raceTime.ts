import { CIRCUIT_COORDS } from "@/lib/constants/circuits";

// CIRCUIT_COORDS is keyed by country name ("Italy", "Monaco"), so this map
// provides circuitId → IANA timezone for the common F1 circuits whose Jolpica
// circuitId differs from any single country key.
const CIRCUIT_TIMEZONES: Record<string, string> = {
  monza: "Europe/Rome",
  monaco: "Europe/Monaco",
  silverstone: "Europe/London",
  spa: "Europe/Brussels",
  hungaroring: "Europe/Budapest",
  interlagos: "America/Sao_Paulo",
  suzuka: "Asia/Tokyo",
  marina_bay: "Asia/Singapore",
  yas_marina: "Asia/Dubai",
  villeneuve: "America/Montreal",
  miami: "America/New_York",
  americas: "America/Chicago",
  vegas: "America/Los_Angeles",
};

/** Format an ISO datetime string in a given IANA timezone. */
export function formatInZone(iso: string, tz: string): string | null {
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).format(date);
  } catch {
    return null;
  }
}

/** Validate that a circuit key resolves to a timezone. */
export function validateCircuitTimezone(circuitId: string): boolean {
  return Boolean(CIRCUIT_TIMEZONES[circuitId] || CIRCUIT_COORDS[circuitId]?.timezone);
}

/** Parse F1 lap-time string "m:ss.mmm" to milliseconds. */
export function lapTimeToMs(lapTime: string): number {
  const m = lapTime.match(/^(\d+):(\d{2}\.\d{3})$/);
  if (!m) return NaN;
  const mins = parseInt(m[1], 10);
  const secs = parseFloat(m[2]);
  if (isNaN(mins) || isNaN(secs)) return NaN;
  return mins * 60_000 + Math.round(secs * 1000);
}

/** Build race start times in venue and US Eastern zones. */
export function buildRaceStartTimes(
  dateStr: string,
  timeStr: string | null,
  circuitId: string
): { venue: string | null; utc: string | null } {
  if (!dateStr || !timeStr) return { venue: null, utc: null };

  const iso = `${dateStr}T${timeStr}`;
  const tz = CIRCUIT_TIMEZONES[circuitId] || CIRCUIT_COORDS[circuitId]?.timezone;
  if (!tz) return { venue: null, utc: null };

  return {
    venue: formatInZone(iso, tz),
    utc: formatInZone(iso, "UTC"),
  };
}
