/**
 * Shared race-result predicates and maths. Single source of truth.
 */

/** A result is classified as finished when status is "Finished" or "+N Lap(s)". */
export function isFinished(status: string | undefined): boolean {
  if (!status) return false;
  return status === "Finished" || /^\+\d+\s+Lap/.test(status);
}

/** A result is a DNF when it is not classified as finished. */
export function isDnf(status: string | undefined): boolean {
  return !isFinished(status);
}

/** Arithmetic mean; empty array returns 0. */
export function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length;
}