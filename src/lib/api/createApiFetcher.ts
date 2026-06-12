import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";
import { withRetry } from "@/lib/api/retry";
import { createConcurrencyLimiter } from "@/lib/api/concurrencyLimiter";

/**
 * Default in-flight cap per upstream service. Jolpica enforces ~4 req/s per
 * IP; a cap of 2 leaves headroom for retries and other code paths in the
 * same serverless instance to share the budget without ever bursting over.
 */
const DEFAULT_MAX_CONCURRENT = 2;

/**
 * Build a typed fetch wrapper for one external API.
 *
 * Adds two layers of protection so a single upstream blip (or our own burst
 * pattern) doesn't surface as a null/error to downstream consumers:
 *
 *  1. A per-service concurrency limiter caps in-flight requests, so a route
 *     that fans out 10 parallel calls won't hit the upstream's rate limit.
 *  2. Bounded retry-with-backoff for transient failures (timeouts, 429, 5xx)
 *     via the shared `withRetry` helper.
 */
export function createApiFetcher(
  baseUrl: string,
  serviceName: string,
  maxConcurrent: number = DEFAULT_MAX_CONCURRENT,
  // Per-request timeout (ms). Omit to use fetchWithTimeout's 8 s default —
  // appropriate for user requests. Background batch jobs (the snapshot
  // writers) pass a generous value so large payloads / a slow upstream
  // don't abort prematurely.
  timeoutMs?: number,
) {
  const limiter = createConcurrencyLimiter(maxConcurrent);

  return async function apiFetch<T>(path: string, revalidate: number): Promise<T> {
    return withRetry(async () => {
      await limiter.acquire();
      try {
        const url = `${baseUrl}${path}`;
        const init = {
          next: { revalidate },
          headers: { Accept: "application/json" },
        };
        const res =
          timeoutMs === undefined
            ? await fetchWithTimeout(url, init)
            : await fetchWithTimeout(url, init, timeoutMs);
        if (!res.ok) {
          throw new Error(`${serviceName} fetch failed: ${res.status} ${path}`);
        }
        return (await res.json()) as T;
      } finally {
        limiter.release();
      }
    });
  };
}