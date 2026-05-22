/**
 * Helpers for working with `Promise.allSettled` results.
 *
 * Centralizes the repetitive `result.status === "fulfilled" ? result.value : fallback`
 * pattern that was duplicated across multiple API routes and server pages.
 */

/**
 * Return the resolved value of a settled promise, or `fallback` if it rejected.
 */
export function extractFulfilled<T>(
  result: PromiseSettledResult<T>,
  fallback: T,
): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

/**
 * Map over an array of settled promises, returning a parallel array of values
 * where each rejected entry is replaced by `fallback`.
 */
export function extractAllFulfilled<T>(
  results: PromiseSettledResult<T>[],
  fallback: T,
): T[] {
  return results.map((r) => extractFulfilled(r, fallback));
}
