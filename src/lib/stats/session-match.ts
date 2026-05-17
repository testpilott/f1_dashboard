/**
 * Resolve which OpenF1 "Race" session corresponds to a Jolpica race, matched
 * by country. Jolpica and OpenF1 spell some countries differently, so we
 * normalise and allow a small set of known aliases. Pure / testable.
 */
import type { OpenF1Session } from "@/lib/types";

const ALIASES: Record<string, string> = {
  uk: "great britain",
  "united kingdom": "great britain",
  britain: "great britain",
  usa: "united states",
  "united states of america": "united states",
  uae: "united arab emirates",
  korea: "south korea",
};

function normalise(country: string): string {
  const c = country.trim().toLowerCase();
  return ALIASES[c] ?? c;
}

/**
 * Pick the Race session for the given country from a list of OpenF1 sessions.
 * Returns the session_key, or null when there is no confident match.
 */
export function pickRaceSession(
  sessions: OpenF1Session[],
  country: string,
): number | null {
  if (!Array.isArray(sessions) || sessions.length === 0 || !country) return null;

  const target = normalise(country);
  const races = sessions.filter(
    (s) => s.session_type === "Race" && !s.is_cancelled,
  );

  const exact = races.find((s) => normalise(s.country_name) === target);
  if (exact) return exact.session_key;

  const partial = races.find((s) => {
    const c = normalise(s.country_name);
    return c.includes(target) || target.includes(c);
  });
  return partial ? partial.session_key : null;
}
