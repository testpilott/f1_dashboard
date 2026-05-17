/**
 * Minimal RFC-5545 (iCalendar) builder for the F1 race schedule.
 * Pure & dependency-free so it can be unit-tested in isolation.
 */
import type { Race } from "@/lib/types";

/** Escape a TEXT value per RFC 5545 §3.3.11. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Fold a content line to ≤75 octets with CRLF + single leading space. */
export function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  chunks.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    chunks.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  return chunks.join("\r\n");
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** UTC timestamp YYYYMMDDTHHMMSSZ. */
function toUtcStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** Date-only value YYYYMMDD (for all-day events). */
function toDateValue(isoDate: string): string {
  return isoDate.replace(/-/g, "");
}

function nextDay(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

export interface BuildICSOptions {
  /** Stamp used for DTSTAMP (defaults to now). Injectable for deterministic tests. */
  now?: Date;
  season?: string;
}

/**
 * Build a VCALENDAR string with one VEVENT per race (the race start, 2h long;
 * all-day when the API gives no start time).
 */
export function buildICS(races: Race[], opts: BuildICSOptions = {}): string {
  const stamp = toUtcStamp(opts.now ?? new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//F1 Dashboard//Race Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const race of Array.isArray(races) ? races : []) {
    const season = race.season ?? opts.season ?? "";
    const uid = `f1-${season}-r${race.round}@f1-dashboard`;
    const loc = [
      race.Circuit?.circuitName,
      race.Circuit?.Location?.locality,
      race.Circuit?.Location?.country,
    ]
      .filter(Boolean)
      .join(", ");

    lines.push("BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${stamp}`);

    if (race.time) {
      const t = race.time.endsWith("Z") ? race.time : `${race.time}Z`;
      const start = new Date(`${race.date}T${t}`);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      lines.push(`DTSTART:${toUtcStamp(start)}`, `DTEND:${toUtcStamp(end)}`);
    } else {
      lines.push(
        `DTSTART;VALUE=DATE:${toDateValue(race.date)}`,
        `DTEND;VALUE=DATE:${nextDay(race.date)}`,
      );
    }

    lines.push(
      foldLine(`SUMMARY:${escapeText(race.raceName)}`),
      foldLine(`LOCATION:${escapeText(loc)}`),
      foldLine(
        `DESCRIPTION:${escapeText(
          `Round ${race.round} of the ${season} FIA Formula One World Championship`,
        )}`,
      ),
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
