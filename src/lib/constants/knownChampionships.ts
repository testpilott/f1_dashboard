/**
 * Closed-list source of truth for Formula 1 World Drivers' Champions.
 *
 * Keyed by Ergast/Jolpica `driverId` (matching the IDs returned by
 * `/api/f1/drivers/...`). Values are the driver's final championship count.
 *
 * This list is the **floor** used by `getDriverCareerChampionships`: even when
 * the upstream Jolpica fan-out fails (rate limit, timeout, 5xx), the driver
 * career API will never report fewer championships than the value here.
 *
 * Maintenance rule: when a new World Champion is crowned, add or bump the
 * driver here in the same PR that ships the season-end data refresh. A title
 * count never decreases, so old entries are immutable.
 */
export const KNOWN_CHAMPIONSHIPS: Readonly<Record<string, number>> = {
  // 7-time champions
  michael_schumacher: 7,
  hamilton: 7,
  // 5-time champions
  fangio: 5,
  // 4-time champions
  prost: 4,
  vettel: 4,
  max_verstappen: 4,
  // 3-time champions
  brabham: 3,
  stewart: 3,
  lauda: 3,
  piquet: 3,
  senna: 3,
  // 2-time champions
  ascari: 2,
  graham_hill: 2,
  clark: 2,
  fittipaldi: 2,
  hakkinen: 2,
  alonso: 2,
  // 1-time champions
  farina: 1,
  hawthorn: 1,
  phil_hill: 1,
  surtees: 1,
  hulme: 1,
  rindt: 1,
  hunt: 1,
  andretti: 1,
  jones: 1,
  keke_rosberg: 1,
  scheckter: 1,
  mansell: 1,
  damon_hill: 1,
  jacques_villeneuve: 1,
  raikkonen: 1,
  button: 1,
  rosberg: 1, // Nico Rosberg, 2016
  norris: 1, // 2025
};

/** Returns the floor (0 if the driver has no known championship). */
export function getKnownChampionshipFloor(driverId: string): number {
  return KNOWN_CHAMPIONSHIPS[driverId] ?? 0;
}
