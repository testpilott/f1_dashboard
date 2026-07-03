import { describe, expect, it } from "vitest";
import { rateLimited } from "@/lib/api/withRateLimit";

function makeReq(ip: string): Request {
  return new Request("http://localhost/api/test", {
    headers: { "x-forwarded-for": ip },
  });
}

describe("rateLimited", () => {
  it("returns null (allowed) below the limit", () => {
    expect(rateLimited(makeReq("10.0.0.1"), "wrl-allowed")).toBeNull();
  });

  it("returns a 429 once the per-route limit is exceeded", () => {
    const req = makeReq("10.0.0.2");
    for (let i = 0; i < 3; i++) {
      expect(rateLimited(req, "wrl-blocked", { max: 3 })).toBeNull();
    }
    const blocked = rateLimited(req, "wrl-blocked", { max: 3 });
    expect(blocked?.status).toBe(429);
  });

  it("computes Retry-After from the route's actual window, not a fixed 60", () => {
    const req = makeReq("10.0.0.3");
    rateLimited(req, "wrl-window", { windowMs: 30_000, max: 1 });
    const blocked = rateLimited(req, "wrl-window", { windowMs: 30_000, max: 1 });
    expect(blocked?.headers.get("Retry-After")).toBe("30");
  });

  it("defaults Retry-After to 60 for the default window", () => {
    const req = makeReq("10.0.0.4");
    rateLimited(req, "wrl-default", { max: 1 });
    const blocked = rateLimited(req, "wrl-default", { max: 1 });
    expect(blocked?.headers.get("Retry-After")).toBe("60");
  });

  it("includes the limit in a X-RateLimit-Limit header on 429s", () => {
    const req = makeReq("10.0.0.5");
    rateLimited(req, "wrl-headers", { max: 1 });
    const blocked = rateLimited(req, "wrl-headers", { max: 1 });
    expect(blocked?.headers.get("X-RateLimit-Limit")).toBe("1");
  });

  it("rounds sub-second windows up to at least 1 second", () => {
    const req = makeReq("10.0.0.6");
    rateLimited(req, "wrl-tiny", { windowMs: 250, max: 1 });
    const blocked = rateLimited(req, "wrl-tiny", { windowMs: 250, max: 1 });
    expect(blocked?.headers.get("Retry-After")).toBe("1");
  });
});
