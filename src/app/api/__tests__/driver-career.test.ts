import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(),
}));

vi.mock("@/lib/api/jolpica", () => ({
  getDriverCareerWins: vi.fn(),
  getDriverCareerP2: vi.fn(),
  getDriverCareerP3: vi.fn(),
  getDriverCareerStarts: vi.fn(),
  getDriverCareerFastestLaps: vi.fn(),
}));

import { GET } from "@/app/api/driver-career/route";
import { rateLimited } from "@/lib/api/withRateLimit";
import {
  getDriverCareerFastestLaps,
  getDriverCareerP2,
  getDriverCareerP3,
  getDriverCareerStarts,
  getDriverCareerWins,
} from "@/lib/api/jolpica";

function makeRequest(driverId = "max_verstappen") {
  return new Request(`http://localhost/api/driver-career?driverId=${encodeURIComponent(driverId)}`);
}

describe("GET /api/driver-career", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimited).mockReturnValue(null);
    vi.mocked(getDriverCareerWins).mockResolvedValue("60");
    vi.mocked(getDriverCareerP2).mockResolvedValue("20");
    vi.mocked(getDriverCareerP3).mockResolvedValue("18");
    vi.mocked(getDriverCareerStarts).mockResolvedValue("210");
    vi.mocked(getDriverCareerFastestLaps).mockResolvedValue("44");
  });

  it("returns rate-limit response when blocked", async () => {
    vi.mocked(rateLimited).mockReturnValue(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }),
    );

    const res = await GET(makeRequest());
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid driverId", async () => {
    const res = await GET(makeRequest("INVALID DRIVER"));
    expect(res.status).toBe(400);
  });

  it("returns career totals when all fetchers resolve", async () => {
    const res = await GET(makeRequest("max_verstappen"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      driverId: "max_verstappen",
      career: {
        wins: 60,
        podiums: 98,
        starts: 210,
        fastestLaps: 44,
        championships: 0,
      },
    });
  });

  it("returns partial totals when some upstream calls fail", async () => {
    vi.mocked(getDriverCareerWins).mockRejectedValue(new Error("wins endpoint down"));
    vi.mocked(getDriverCareerP3).mockRejectedValue(new Error("p3 endpoint down"));
    vi.mocked(getDriverCareerFastestLaps).mockRejectedValue(new Error("fl endpoint down"));

    const res = await GET(makeRequest("hamilton"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      driverId: "hamilton",
      career: {
        wins: 0,
        podiums: 20,
        starts: 210,
        fastestLaps: 0,
        championships: 0,
      },
    });
  });
});
