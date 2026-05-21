import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";
import { withRetry } from "@/lib/api/retry";

/**
 * Build a typed fetch wrapper for one external API.
 *
 * Adds bounded retry-with-backoff for transient failures (timeouts, 429,
 * and 5xx) via the shared `withRetry` helper so a single upstream blip
 * doesn't surface as a null/error to downstream consumers.
 */
export function createApiFetcher(baseUrl: string, serviceName: string) {
  return async function apiFetch<T>(path: string, revalidate: number): Promise<T> {
    return withRetry(async () => {
      const res = await fetchWithTimeout(`${baseUrl}${path}`, {
        next: { revalidate },
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        throw new Error(`${serviceName} fetch failed: ${res.status} ${path}`);
      }
      return (await res.json()) as T;
    });
  };
}