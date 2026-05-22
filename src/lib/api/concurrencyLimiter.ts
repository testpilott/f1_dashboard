/**
 * Tiny per-service concurrency limiter (in-process semaphore).
 *
 * Used by `createApiFetcher` to cap concurrent in-flight requests to a single
 * upstream host. Jolpica enforces ~4 requests/second per IP; without a cap a
 * single driver-career request can fire 10+ parallel calls (6 stat fetchers
 * plus a championship fan-out) and immediately trigger HTTP 429.
 *
 * The limiter queues callers FIFO once `maxConcurrent` permits are taken and
 * resumes them as permits are released. Per-instance only — Vercel serverless
 * cold starts will each have their own limiter, which is exactly the scope
 * that matters because the burst happens inside a single request.
 */
export interface ConcurrencyLimiter {
  acquire(): Promise<void>;
  release(): void;
  /** Internal accessors exposed for tests. */
  readonly inFlight: number;
  readonly queued: number;
}

export function createConcurrencyLimiter(maxConcurrent: number): ConcurrencyLimiter {
  if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1) {
    throw new Error("createConcurrencyLimiter: maxConcurrent must be a positive integer");
  }

  let active = 0;
  const queue: Array<() => void> = [];

  function acquire(): Promise<void> {
    if (active < maxConcurrent) {
      active++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      queue.push(() => {
        active++;
        resolve();
      });
    });
  }

  function release(): void {
    if (active === 0) return; // defensive: never go negative
    active--;
    const next = queue.shift();
    if (next) next();
  }

  return {
    acquire,
    release,
    get inFlight() {
      return active;
    },
    get queued() {
      return queue.length;
    },
  };
}
