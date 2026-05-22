import { describe, expect, it } from "vitest";

import { createConcurrencyLimiter } from "@/lib/api/concurrencyLimiter";

describe("createConcurrencyLimiter", () => {
  it("rejects non-positive limits", () => {
    expect(() => createConcurrencyLimiter(0)).toThrow(/positive integer/);
    expect(() => createConcurrencyLimiter(-1)).toThrow(/positive integer/);
    expect(() => createConcurrencyLimiter(1.5)).toThrow(/positive integer/);
  });

  it("admits up to maxConcurrent permits immediately", async () => {
    const limiter = createConcurrencyLimiter(3);
    await limiter.acquire();
    await limiter.acquire();
    await limiter.acquire();
    expect(limiter.inFlight).toBe(3);
    expect(limiter.queued).toBe(0);
  });

  it("queues callers beyond maxConcurrent and resumes them on release in FIFO order", async () => {
    const limiter = createConcurrencyLimiter(2);
    const completed: number[] = [];

    await limiter.acquire(); // #1
    await limiter.acquire(); // #2 — at capacity

    const pending3 = limiter.acquire().then(() => completed.push(3));
    const pending4 = limiter.acquire().then(() => completed.push(4));

    expect(limiter.inFlight).toBe(2);
    expect(limiter.queued).toBe(2);

    // Release one — #3 should resume.
    limiter.release();
    await pending3;
    expect(completed).toEqual([3]);
    expect(limiter.inFlight).toBe(2);
    expect(limiter.queued).toBe(1);

    // Release another — #4 should resume.
    limiter.release();
    await pending4;
    expect(completed).toEqual([3, 4]);
    expect(limiter.queued).toBe(0);
  });

  it("caps observed concurrency when stressed by a parallel burst", async () => {
    const limiter = createConcurrencyLimiter(2);
    let inFlight = 0;
    let peak = 0;

    async function worker() {
      await limiter.acquire();
      try {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await Promise.resolve(); // yield so concurrent acquires can interleave
        inFlight--;
      } finally {
        limiter.release();
      }
    }

    await Promise.all(Array.from({ length: 10 }, () => worker()));

    expect(peak).toBeLessThanOrEqual(2);
    expect(limiter.inFlight).toBe(0);
    expect(limiter.queued).toBe(0);
  });

  it("release is a no-op when no permits are held (defensive)", () => {
    const limiter = createConcurrencyLimiter(1);
    expect(() => limiter.release()).not.toThrow();
    expect(limiter.inFlight).toBe(0);
  });
});
