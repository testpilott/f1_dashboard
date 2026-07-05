import type { Race } from "@/lib/types";

/**
 * Sprint-win tallies for one season, keyed by Jolpica identifiers.
 *
 * Kept separate from the standings `wins` field on purpose: the official
 * championship standings count only Grand Prix victories, and the UI
 * renders sprint wins as a distinct secondary element rather than folding
 * them into the headline number.
 */
export interface SprintWinTallies {
  /** driverId → sprint wins this season. Only winners appear. */
  drivers: Record<string, number>;
  /** constructorId → sprint wins this season. Only winners appear. */
  constructors: Record<string, number>;
}

/**
 * Count sprint wins per driver and constructor from a season's sprint
 * results (races carrying `SprintResults`). Rows without a P1 finisher or
 * with missing identifiers are skipped — never throws on partial data.
 */
export function tallySprintWins(races: Race[]): SprintWinTallies {
  const drivers: Record<string, number> = {};
  const constructors: Record<string, number> = {};

  for (const race of races) {
    const winner = (race.SprintResults ?? []).find((r) => r.position === "1");
    if (!winner) continue;

    const driverId = winner.Driver?.driverId;
    if (driverId) drivers[driverId] = (drivers[driverId] ?? 0) + 1;

    const constructorId = winner.Constructor?.constructorId;
    if (constructorId) constructors[constructorId] = (constructors[constructorId] ?? 0) + 1;
  }

  return { drivers, constructors };
}
