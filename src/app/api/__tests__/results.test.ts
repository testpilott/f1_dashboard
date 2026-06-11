import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(() => null),
}));

vi.mock("@/lib/api/jolpica", async () => {
  const { createJolpicaMocks } = await import("@/test/mockJolpica");
  return createJolpicaMocks();
});

import { GET } from "@/app/api/results/route";
import { getQualifyingResults, getRaceResults, getSprintResults } from "@/lib/api/jolpica";
import { makeApiRequest } from "@/test/api";

describe("GET /api/results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when season or round is missing", async () => {
    const res = await GET(makeApiRequest("/api/results", { season: "2026" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/season and round are required/i);
  });

  it("returns race results on success", async () => {
    vi.mocked(getRaceResults).mockResolvedValue([
      { position: "1", Driver: { driverId: "verstappen" } },
    ] as never);

    const res = await GET(makeApiRequest("/api/results", { season: "2026", round: "8" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(getRaceResults).toHaveBeenCalledWith("2026", "8");
    expect(body.results).toHaveLength(1);
    expect(body.results[0].Driver.driverId).toBe("verstappen");
  });

  it("switches to the qualifying endpoint when requested", async () => {
    vi.mocked(getQualifyingResults).mockResolvedValue([
      { position: "1", Driver: { driverId: "leclerc" } },
    ] as never);

    const res = await GET(
      makeApiRequest("/api/results", { season: "2026", round: "8", type: "qualifying" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(getQualifyingResults).toHaveBeenCalledWith("2026", "8");
    expect(body.results[0].Driver.driverId).toBe("leclerc");
  });

  it("returns 500 when the selected upstream endpoint fails", async () => {
    vi.mocked(getSprintResults).mockRejectedValue(new Error("timeout"));

    const res = await GET(
      makeApiRequest("/api/results", { season: "2026", round: "8", type: "sprint" }),
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatch(/internal server error/i);
  });
});