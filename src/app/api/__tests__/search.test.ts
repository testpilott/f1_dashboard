import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(() => null),
}));

vi.mock("@/lib/api/jolpica", () => ({
  getDriverStandings: vi.fn(),
  getConstructorStandings: vi.fn(),
  getSchedule: vi.fn(),
}));

import { GET } from "@/app/api/search/route";
import { getConstructorStandings, getDriverStandings, getSchedule } from "@/lib/api/jolpica";
import { makeApiRequest } from "@/test/api";

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for an invalid query", async () => {
    const res = await GET(makeApiRequest("/api/search", { q: "" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/invalid query/i);
  });

  it("returns ranked results on success", async () => {
    vi.mocked(getDriverStandings).mockResolvedValue([
      {
        Driver: { driverId: "norris", givenName: "Lando", familyName: "Norris" },
        Constructors: [{ name: "McLaren" }],
      },
    ] as never);
    vi.mocked(getConstructorStandings).mockResolvedValue([
      { Constructor: { constructorId: "mclaren", name: "McLaren" } },
    ] as never);
    vi.mocked(getSchedule).mockResolvedValue([
      {
        season: "2026",
        round: "8",
        raceName: "Monaco Grand Prix",
        Circuit: {
          circuitId: "monaco",
          circuitName: "Circuit de Monaco",
          Location: { country: "Monaco" },
        },
      },
    ] as never);

    const res = await GET(makeApiRequest("/api/search", { q: "lando" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.q).toBe("lando");
    expect(body.results[0]).toMatchObject({
      kind: "driver",
      id: "norris",
      label: "Lando Norris",
      href: "/drivers",
    });
  });

  it("gracefully degrades to an empty result set when upstream sources fail", async () => {
    vi.mocked(getDriverStandings).mockRejectedValue(new Error("timeout"));
    vi.mocked(getConstructorStandings).mockRejectedValue(new Error("timeout"));
    vi.mocked(getSchedule).mockRejectedValue(new Error("timeout"));

    const res = await GET(makeApiRequest("/api/search", { q: "norris" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ q: "norris", results: [] });
  });
});