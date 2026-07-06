/**
 * "Has this race actually finished?" — distinct from the schedule page's
 * date-only `isPast` check, which flips at midnight on race day and would
 * hide session timings on the morning of the race (exactly when users
 * want them).
 */

/**
 * Buffer after lights-out before a race is treated as complete: covers the
 * ~2h race itself plus podium/stewarding and the results feed publishing.
 */
export const RACE_FINISH_BUFFER_MS = 4 * 60 * 60 * 1000;

/**
 * True once the race can be assumed complete.
 *
 * With a start time: start + RACE_FINISH_BUFFER_MS has passed.
 * Without one (some historical rows): the whole UTC race day has passed.
 * Malformed input is never "finished" — callers fall back to showing timings.
 */
export function hasRaceFinished(
  dateStr: string,
  timeStr: string | null | undefined,
  nowMs: number,
): boolean {
  if (!dateStr) return false;

  if (timeStr) {
    const start = Date.parse(`${dateStr}T${timeStr}`);
    if (!Number.isNaN(start)) return nowMs >= start + RACE_FINISH_BUFFER_MS;
  }

  const dayEnd = Date.parse(`${dateStr}T23:59:59Z`);
  return !Number.isNaN(dayEnd) && nowMs > dayEnd;
}
