/**
 * Consistent parsing of string fields from external race data.
 */

/** Finishing/grid position, with missing/invalid values defaulting to 99. */
export function parsePosition(value: string | undefined): number {
  const n = parseInt(value ?? "99", 10);
  return Number.isFinite(n) ? n : 99;
}

/** Championship points, with missing/invalid values defaulting to 0. */
export function parsePoints(value: string | undefined): number {
  const n = parseFloat(value ?? "0");
  return Number.isFinite(n) ? n : 0;
}

/** Grid slot, with missing/invalid values defaulting to 0. */
export function parseGrid(value: string | undefined): number {
  const n = parseInt(value ?? "0", 10);
  return Number.isFinite(n) ? n : 0;
}