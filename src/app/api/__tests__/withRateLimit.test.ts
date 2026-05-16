/**
 * Tests for the rateLimited() helper (src/lib/api/withRateLimit.ts).
 *
 * Verifies that the wrapper correctly forwards to checkRateLimit and
 * returns the right HTTP response shape.
 */
import { describe, it, expect } from "vitest";
import { rateLimited } from "@/lib/api/withRateLimit";

let ipCounter = 0;
/** Return a request with a fresh unique IP so tests don't share rate-limit state. */
function freshRequest(): Request {
  return new Request("http://localhost/test", {
    headers: { "x-forwarded-for": `10.0.${Math.floor(ipCounter / 255)}.${ipCounter++ % 255}` },
  });
}

describe("rateLimited()", () => {
  it("returns null when the request is within the limit", () => {
    const result = rateLimited(freshRequest(), "test-allow");
    expect(result).toBeNull();
  });

  it("returns a 429 NextResponse when the limit is exceeded", () => {
    const req = freshRequest();
    rateLimited(req, "test-block", { max: 1 }); // consume the single allowed request
    const result = rateLimited(req, "test-block", { max: 1 });
    expect(result).not.toBeNull();
    expect(result?.status).toBe(429);
  });

  it("includes Retry-After header in the 429 response", () => {
    const req = freshRequest();
    rateLimited(req, "test-header", { max: 1 });
    const result = rateLimited(req, "test-header", { max: 1 });
    expect(result?.headers.get("Retry-After")).toBe("60");
  });

  it("uses the routeKey as the prefix (different keys are independent)", () => {
    const req = freshRequest();
    // Exhaust route-A limit
    rateLimited(req, "route-a", { max: 1 });
    expect(rateLimited(req, "route-a", { max: 1 })).not.toBeNull();
    // route-b with same IP should still be allowed
    expect(rateLimited(req, "route-b", { max: 1 })).toBeNull();
  });

  it("respects custom max override (projections uses max: 10)", () => {
    const req = freshRequest();
    for (let i = 0; i < 10; i++) {
      expect(rateLimited(req, "proj-test", { max: 10 })).toBeNull();
    }
    expect(rateLimited(req, "proj-test", { max: 10 })).not.toBeNull();
  });
});
