/**
 * Shared retry-with-backoff helper for external HTTP fetchers.
 *
 * Used by `createApiFetcher` (Jolpica/OpenF1/Multiviewer) and by raw
 * `fetchWithTimeout` callers (Wikidata, Open-Meteo) so that every external
 * surface has the same bounded retry behavior:
 *
 *  - 3 attempts total
 *  - 250ms / 500ms / 1000ms exponential backoff
 *  - Retries: AbortError/timeout, network failures, HTTP 408/425/429/5xx
 *  - Fails fast on permanent errors (400/401/403/404, etc.)
 */

export const MAX_ATTEMPTS = 3;
export const BASE_BACKOFF_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("withRetry: unknown error");
}
