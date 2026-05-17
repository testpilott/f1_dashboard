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

  // On a sprint weekend OpenF1 returns two session_type="Race" entries for the
  // same country — the Sprint (session_name "Sprint", earlier) and the Grand
  // Prix (session_name "Race"). Always pick the Grand Prix.
  const isGrandPrix = (s: OpenF1Session) =>
    s.session_name.trim().toLowerCase() === "race";

  const exact = races.filter((s) => normalise(s.country_name) === target);
  if (exact.length > 0) {
    return (exact.find(isGrandPrix) ?? exact[0]).session_key;
  }

  const partial = races.filter((s) => {
    const c = normalise(s.country_name);
    return c.includes(target) || target.includes(c);
  });
  if (partial.length > 0) {
    return (partial.find(isGrandPrix) ?? partial[0]).session_key;
  }
  return null;
}
