import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, getClientIp, flushStaleEntries, getStoreSize } from "@/lib/ratelimit";

// Each test uses a unique key so they don't share the in-memory store.
let keyCounter = 0;
function uniqueKey(label: string): string {
  return `${label}:${++keyCounter}`;
}

// ─── checkRateLimit ───────────────────────────────────────────────────────────

describe("checkRateLimit()", () => {
  it("allows requests under the limit", () => {
    const key = uniqueKey("allow");
    expect(checkRateLimit(key, 60_000, 5)).toBe(true);
    expect(checkRateLimit(key, 60_000, 5)).toBe(true);
    expect(checkRateLimit(key, 60_000, 5)).toBe(true);
  });

  it("allows exactly `max` requests", () => {
    const key = uniqueKey("exact");
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(key, 60_000, 3)).toBe(true);
    }
  });

  it("blocks the (max + 1)th request", () => {
    const key = uniqueKey("block");
    checkRateLimit(key, 60_000, 2);
    checkRateLimit(key, 60_000, 2);
    expect(checkRateLimit(key, 60_000, 2)).toBe(false);
  });

  it("continues to block once over limit", () => {
    const key = uniqueKey("sustained-block");
    checkRateLimit(key, 60_000, 1);
    expect(checkRateLimit(key, 60_000, 1)).toBe(false);
    expect(checkRateLimit(key, 60_000, 1)).toBe(false);
  });

  it("treats different keys independently", () => {
    const k1 = uniqueKey("k1");
    const k2 = uniqueKey("k2");
    checkRateLimit(k1, 60_000, 1);
    // k1 is exhausted, k2 should still be fresh
    expect(checkRateLimit(k1, 60_000, 1)).toBe(false);
    expect(checkRateLimit(k2, 60_000, 1)).toBe(true);
  });

  it("allows requests again after the window expires", async () => {
    const key = uniqueKey("expire");
    // Fill the bucket with a 50ms window
    checkRateLimit(key, 50, 2);
    checkRateLimit(key, 50, 2);
    expect(checkRateLimit(key, 50, 2)).toBe(false);

    // Wait for the window to expire
    await new Promise((r) => setTimeout(r, 60));

    // Should be allowed again
    expect(checkRateLimit(key, 50, 2)).toBe(true);
  });
});

// ─── getClientIp ──────────────────────────────────────────────────────────────

describe("getClientIp()", () => {
  function makeRequest(headers: Record<string, string>): Request {
    return new Request("http://localhost/", { headers });
  }

  it("extracts the first IP from x-forwarded-for", () => {
    const req = makeRequest({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("handles a single IP in x-forwarded-for", () => {
    const req = makeRequest({ "x-forwarded-for": "10.0.0.1" });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const req = makeRequest({ "x-real-ip": "192.168.1.100" });
    expect(getClientIp(req)).toBe("192.168.1.100");
  });

  it("returns 'unknown' when no IP headers are present", () => {
    const req = makeRequest({});
    expect(getClientIp(req)).toBe("unknown");
  });

  it("trims whitespace from x-forwarded-for values", () => {
    const req = makeRequest({ "x-forwarded-for": "  203.0.113.5  , 10.0.0.1" });
    expect(getClientIp(req)).toBe("203.0.113.5");
  });
});

// ─── flushStaleEntries (memory leak fix) ───────────────────────────────────────────────

describe("flushStaleEntries()", () => {
  it("removes keys whose most recent timestamp has expired", async () => {
    const key = uniqueKey("gc-stale");
    checkRateLimit(key, 20, 5); // 20 ms window

    await new Promise((r) => setTimeout(r, 30)); // wait for window to expire

    const sizeBefore = getStoreSize();
    flushStaleEntries(20);
    expect(getStoreSize()).toBeLessThan(sizeBefore);
  });

  it("leaves keys with recent timestamps intact", () => {
    const key = uniqueKey("gc-fresh");
    checkRateLimit(key, 60_000, 5);

    const sizeBefore = getStoreSize();
    // Only flush entries older than 60 s — our fresh entry should survive
    flushStaleEntries(60_000);
    expect(getStoreSize()).toBe(sizeBefore);
  });

  it("is idempotent: calling twice does not shrink further than once", async () => {
    const key = uniqueKey("gc-idempotent");
    checkRateLimit(key, 20, 5);

    await new Promise((r) => setTimeout(r, 30));

    flushStaleEntries(20);
    const sizeAfterFirst = getStoreSize();
    flushStaleEntries(20);
    expect(getStoreSize()).toBe(sizeAfterFirst);
  });
});
