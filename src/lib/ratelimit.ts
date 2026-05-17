/**
 * In-memory sliding window rate limiter.
 * Suitable for single-process deployments. For multi-instance/edge, use Redis.
 */

// Longest rate-limit window used in any route (60 s). Entries whose most recent
// timestamp is older than this are guaranteed to be fully expired.
const MAX_WINDOW_MS = 5 * 60 * 1000; // 5 minutes — conservative upper bound

// Hard cap on tracked IPs. When exceeded, the oldest-inserted entry is evicted
// (FIFO) to prevent unbounded memory growth under rotating-IP attacks.
const MAX_STORE_SIZE = 10_000;

const store = new Map<string, number[]>();

/**
 * Remove entries from the store where every timestamp has expired.
 * Called automatically by the periodic GC interval and available for
 * testing without fake timers.
 *
 * @param maxAgeMs  Maximum age (ms) of the most recent timestamp before an
 *                  entry is considered stale. Defaults to MAX_WINDOW_MS.
 */
export function flushStaleEntries(maxAgeMs = MAX_WINDOW_MS): void {
  const cutoff = Date.now() - maxAgeMs;
  for (const [key, timestamps] of store.entries()) {
    // timestamps are insertion-ordered; last element is most recent.
    if (timestamps.length === 0 || timestamps[timestamps.length - 1] <= cutoff) {
      store.delete(key);
    }
  }
}

/** Returns the number of currently tracked keys. Exported for testing only. */
export function getStoreSize(): number {
  return store.size;
}

// Periodic GC: prevent unbounded Map growth from unique IPs that never make
// a second request. Runs every MAX_WINDOW_MS. .unref() ensures this interval
// does not keep the Node.js process alive (important in test environments).
const _gcInterval = setInterval(flushStaleEntries, MAX_WINDOW_MS);
if (typeof _gcInterval === "object" && typeof (_gcInterval as NodeJS.Timeout).unref === "function") {
  (_gcInterval as NodeJS.Timeout).unref();
}

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

  // Evict oldest entry before inserting a new key to bound memory usage.
  if (!store.has(key) && store.size >= MAX_STORE_SIZE) {
    const first = store.keys().next().value;
    if (first !== undefined) store.delete(first);
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
