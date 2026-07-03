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
 * Adds three layers of protection so a single upstream blip (or our own burst
 * pattern) doesn't surface as a null/error to downstream consumers:
 *
 *  1. Single-flight coalescing: concurrent requests for the same (path,
 *     revalidate) share one in-flight promise. Without this, a cache-miss
 *     stampede (hot cache row expiring, or a cold instance booting under
 *     load) multiplies every fan-out — N concurrent driver-career requests
 *     would fire N×7 identical Jolpica calls. All requests here are
 *     idempotent GETs, so sharing the response is always safe.
 *  2. A per-service concurrency limiter caps in-flight requests, so a route
 *     that fans out 10 parallel calls won't hit the upstream's rate limit.
 *  3. Bounded retry-with-backoff for transient failures (timeouts, 429, 5xx)
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
  // In-flight GETs keyed by path+revalidate. Entries are removed as soon as
  // the promise settles, so failures are never cached — only genuinely
  // concurrent callers share a result (and share a failure).
  const inFlight = new Map<string, Promise<unknown>>();

  return async function apiFetch<T>(path: string, revalidate: number): Promise<T> {
    const coalesceKey = `${path}|${revalidate}`;
    const existing = inFlight.get(coalesceKey);
    if (existing) return existing as Promise<T>;

    const request = withRetry(async () => {
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
    }).finally(() => {
      inFlight.delete(coalesceKey);
    });

    inFlight.set(coalesceKey, request);
    return request;
  };
}
