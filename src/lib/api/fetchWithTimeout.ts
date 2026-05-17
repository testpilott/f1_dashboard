/**
 * fetch() wrapper that aborts after `timeoutMs` (default 8 s).
 * Throws a DOMException with name "AbortError" on timeout.
 * Throws an Error on a non-OK (>=400) HTTP response so callers fail fast.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = 8_000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status} ${res.statusText}`.trim());
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}
