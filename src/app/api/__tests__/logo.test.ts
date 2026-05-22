import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(() => null),
}));

import { GET } from "@/app/api/logo/route";
import { makeApiRequest } from "@/test/api";

describe("GET /api/logo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when team param is missing", async () => {
    const res = await GET(makeApiRequest("/api/logo"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/team param required/i);
  });

  it("returns 404 for an unknown team", async () => {
    const res = await GET(makeApiRequest("/api/logo", { team: "NotARealTeam" }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/unknown team/i);
  });

  it("redirects (3xx) to a static /logos/* path for a known team", async () => {
    const res = await GET(makeApiRequest("/api/logo", { team: "Ferrari" }));
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    const location = res.headers.get("location");
    expect(location).not.toBeNull();
    expect(location).toMatch(/\/logos\//);
    expect(res.headers.get("cache-control")).toMatch(/max-age=86400/);
  });
});
