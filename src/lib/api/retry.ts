/**
 * Shared retry-with-backoff helper for external HTTP fetchers.
 *
 * Used by `createApiFetcher` (Jolpica/OpenF1/Multiviewer) and by raw
 * `fetchWithTimeout` callers (Wikidata, Open-Meteo) so that every external
 * surface has the same bounded retry behavior:
 *
 *  - 3 attempts total
 *  - 500ms / 1000ms / 2000ms exponential backoff with ±50% jitter
 *  - Retries: AbortError/timeout, network failures, HTTP 408/425/429/5xx
 *  - Fails fast on permanent errors (400/401/403/404, etc.)
 *
 * Jitter (random 0.5x–1.5x) prevents synchronized retries from a parallel
 * fan-out (e.g. 6 driver-career fetchers) hammering the upstream at the
 * same instants. The base backoff is sized to clear typical rate-limit
 * windows (~1s) on the first retry.
 */

export const MAX_ATTEMPTS = 3;
export const BASE_BACKOFF_MS = 500;
export const JITTER_RATIO = 0.5; // delay multiplied by random in [1 - r, 1 + r]

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attempt: number): number {
  const nominal = BASE_BACKOFF_MS * 2 ** (attempt - 1);
  const min = 1 - JITTER_RATIO;
  const span = JITTER_RATIO * 2;
  return Math.round(nominal * (min + Math.random() * span));
}

/**
 * Decide whether an error from a fetch attempt is worth retrying.
 *
 * Matches the two error-message shapes our fetch layer produces:
 *  - `fetchWithTimeout` throws "Request failed: <status> <statusText>"
 *  - `createApiFetcher` throws "<service> fetch failed: <status> <path>"
 */
export function isRetryable(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (!(err instanceof Error)) return false;
  if (err.name === "AbortError") return true;

  const match = err.message.match(/(?:Request|fetch) failed:\s*(\d{3})/);
  if (match) {
    const status = Number(match[1]);
    if (status === 408 || status === 425 || status === 429) return true;
    if (status >= 500 && status < 600) return true;
    return false;
  }

  // Network-level failure (DNS, connection reset, etc).
  return /fetch failed|network|ECONN|ETIMEDOUT|socket hang up/i.test(err.message);
}

/**
 * Run `fn` with bounded retry-with-backoff for transient failures.
 * Re-throws the last error if all attempts fail or the error is not retryable.
 */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt >= MAX_ATTEMPTS || !isRetryable(err)) break;
      await sleep(backoffDelay(attempt));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("withRetry: unknown error");
}
