/**
 * In-memory sliding window rate limiter.
 * Suitable for single-process deployments. For multi-instance/edge, use Redis.
 */

const store = new Map<string, number[]>();

/**
 * Check whether the given key is within the rate limit.
 * @param key      Unique identifier (e.g. IP address + route).
 * @param windowMs  Time window in milliseconds.
 * @param max       Maximum allowed requests within the window.
 * @returns `true` if the request is allowed, `false` if rate-limited.
 */
export function checkRateLimit(key: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  const timestamps = (store.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= max) {
    return false;
  }

  timestamps.push(now);
  store.set(key, timestamps);
  return true;
}

/** Extract the client IP from a Next.js Request (best-effort). */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
