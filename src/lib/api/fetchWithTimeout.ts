/**
 * fetch() wrapper that aborts after `timeoutMs` (default 8 s).
 * Throws a DOMException with name "AbortError" on timeout.
 * Throws a TypeError on non-OK responses.
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
    return res;
  } finally {
    clearTimeout(timer);
  }
}
