export const ET_TIME_ZONE = "America/New_York";
export const WEEKLY_CACHE_REVALIDATE_SECONDS = 604800;

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: ET_TIME_ZONE,
  weekday: "short",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: ET_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function etWeekdayIndex(date: Date): number {
  const token = WEEKDAY_FORMATTER.format(date);
  const idx = WEEKDAY_TO_INDEX[token];
  return idx ?? 0;
}

function formatEtDate(date: Date): string {
  return DATE_FORMATTER.format(date);
}

/**
 * Returns the current ET week bucket as the Monday date (YYYY-MM-DD).
 * The key changes exactly at Monday 00:00 America/New_York time.
 */
export function currentEtWeekBucket(now = new Date()): string {
  const cursor = new Date(now);
  for (let i = 0; i < 7; i += 1) {
    if (etWeekdayIndex(cursor) === 1) {
      return formatEtDate(cursor);
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return formatEtDate(cursor);
}
