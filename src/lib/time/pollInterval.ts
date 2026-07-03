/**
 * Defense-in-depth clamp for server-driven client poll intervals.
 *
 * The driver-season route tells clients how soon to re-check for delayed
 * race results via `resultsFeedLag.checkAgainAfterMs`. That value flows
 * straight into React Query's `refetchInterval` — so a server-side bug that
 * emitted a tiny value would turn every open tab into a tight polling loop
 * against our own API. The server's real minimum is 10 minutes; this floor
 * only exists to make the failure mode boring.
 */

export const MIN_POLL_INTERVAL_MS = 60_000;

/**
 * Returns a safe poll interval: the given value clamped to the floor, or
 * `fallbackMs` when the input is not a positive finite number.
 */
export function clampPollIntervalMs(ms: unknown, fallbackMs: number): number {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms <= 0) return fallbackMs;
  return Math.max(ms, MIN_POLL_INTERVAL_MS);
}
