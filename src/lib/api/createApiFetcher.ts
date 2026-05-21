import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Decide whether an error from a fetch attempt is worth retrying.
 * Retryable: timeouts (AbortError), network failures, and HTTP 408/425/429/5xx.
 */
function isRetryable(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (!(err instanceof Error)) return false;
  if (err.name === "AbortError") return true;

  // fetchWithTimeout throws "Request failed: <status>" for non-ok responses,
  // and createApiFetcher itself throws "<service> fetch failed: <status> <path>"
  // when given a non-ok Response. Match either shape.
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
 * Build a typed fetch wrapper for one external API.
 *
 * Adds bounded retry-with-backoff for transient failures (timeouts, 429,
 * and 5xx) so a single upstream blip doesn't surface as a null/error
 * to downstream consumers.
 */
export function createApiFetcher(baseUrl: string, serviceName: string) {
  return async function apiFetch<T>(path: string, revalidate: number): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetchWithTimeout(`${baseUrl}${path}`, {
          next: { revalidate },
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          throw new Error(`${serviceName} fetch failed: ${res.status} ${path}`);
        }
        return (await res.json()) as T;
      } catch (err) {
        lastError = err;
        if (attempt >= MAX_ATTEMPTS || !isRetryable(err)) break;
        // Exponential backoff: 250ms, 500ms, 1000ms…
        await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1));
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`${serviceName} fetch failed: unknown error for ${path}`);
  };
}