import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(() => null),
}));

vi.mock("@/lib/api/jolpica", () => ({
  getDriverStandings: vi.fn(),
  getConstructorStandings: vi.fn(),
}));

import { GET } from "@/app/api/standings/route";
import { getConstructorStandings, getDriverStandings } from "@/lib/api/jolpica";
import { makeApiRequest } from "@/test/api";

describe("GET /api/standings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for an invalid season", async () => {
    const res = await GET(makeApiRequest("/api/standings", { season: "bad" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/invalid season/i);
  });

  it("returns drivers and constructors on success", async () => {
    vi.mocked(getDriverStandings).mockResolvedValue([
      {
        position: "1",
        Driver: { driverId: "verstappen", givenName: "Max", familyName: "Verstappen" },
      },
    ] as never);
    vi.mocked(getConstructorStandings).mockResolvedValue([
      {
        position: "1",
        Constructor: { constructorId: "red_bull", name: "Red Bull Racing" },
      },
    ] as never);

    const res = await GET(makeApiRequest("/api/standings", { season: "2026" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(getDriverStandings).toHaveBeenCalledWith("2026");
    expect(getConstructorStandings).toHaveBeenCalledWith("2026");
    expect(body.drivers).toHaveLength(1);
    expect(body.constructors).toHaveLength(1);
    expect(body.drivers[0].Driver.driverId).toBe("verstappen");
    expect(body.constructors[0].Constructor.constructorId).toBe("red_bull");
  });

  it("returns 500 when an upstream fetch fails", async () => {
    vi.mocked(getDriverStandings).mockRejectedValue(new Error("timeout"));

    const res = await GET(makeApiRequest("/api/standings", { season: "2026" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatch(/internal server error/i);
  });
});