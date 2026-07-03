/**
 * Retry predicate for the client-side React Query default options.
 *
 * The naive `retry: 2` retries EVERY failure — including HTTP 429, which
 * means a rate-limited browser automatically sends 3× the traffic exactly
 * when the server asked it to slow down. This predicate keeps bounded
 * retries for genuinely transient failures (network drops, 5xx, timeouts)
 * and fails fast on anything the client cannot fix by retrying (4xx).
 *
 * Matches the error shape thrown by `fetchJson` in clientFetch.ts:
 * "Request failed: <status> <url>".
 */

export const MAX_CLIENT_RETRIES = 2;

const STATUS_PATTERN = /Request failed:\s*(\d{3})/;

export function isRetryableClientError(error: unknown): boolean {
  if (error instanceof Error) {
    const match = error.message.match(STATUS_PATTERN);
    if (match) {
      const status = Number(match[1]);
      if (status === 408) return true; // request timeout — transient
      if (status >= 400 && status < 500) return false; // incl. 429: back off
      return true; // 5xx — upstream blip
    }
  }
  // No parsable HTTP status: network failure, truncated-JSON SyntaxError,
  // or a non-Error throwable. Treat as transient.
  return true;
}

/** Drop-in for React Query's `retry` option. */
export function clientQueryRetry(failureCount: number, error: unknown): boolean {
  return failureCount < MAX_CLIENT_RETRIES && isRetryableClientError(error);
}
