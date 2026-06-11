const FIRST_YEAR = 1950;

/**
 * Returns the active F1 season year derived from the current date.
 * F1 seasons typically start in early-to-mid March; before March we treat
 * the prior calendar year as "current" to avoid empty dropdowns / 404s
 * against the new season's data that hasn't published yet.
 */
function getCurrentSeasonYear(): number {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0 = Jan
  return month < 2 ? year - 1 : year;
}

const CURRENT_YEAR = getCurrentSeasonYear();

/** All valid season option values, descending (most recent first). */
export const SEASON_OPTIONS: string[] = Array.from(
  { length: CURRENT_YEAR - FIRST_YEAR + 1 },
  (_, i) => String(CURRENT_YEAR - i)
); // ["2026", "2025", ..., "1950"]

/** The seasons offered by SeasonPicker (most recent 6 only). */
export const RECENT_SEASONS: string[] = SEASON_OPTIONS.slice(0, 6);

/** True for "current" or any 4-digit year in the valid range. */
export function isValidSeasonParam(value: string): boolean {
  if (value === "current") return true;
  if (!/^\d{4}$/.test(value)) return false;
  const y = parseInt(value, 10);
  return y >= FIRST_YEAR && y <= CURRENT_YEAR;
}

/**
 * Normalise a raw ?season= param.
 * Returns "current" for "2026", the 4-digit string for valid historical years,
 * or "current" as a fallback for anything invalid.
 */
export function normalizeSeason(raw: string | null): string {
  if (!raw || !isValidSeasonParam(raw)) return "current";
  if (raw === String(CURRENT_YEAR) || raw === "current") return "current";
  return raw;
}

/** Human-readable label, e.g. "2026 (current)" vs "2023". */
export function seasonLabel(season: string): string {
  if (season === "current" || season === String(CURRENT_YEAR)) {
    return `${CURRENT_YEAR} (current)`;
  }
  return season;
}
