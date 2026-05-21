import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(),
}));

vi.mock("@/lib/api/openf1", () => ({
  getDriversForSession: vi.fn(),
}));

import { GET } from "@/app/api/driver-photos/route";
import { rateLimited } from "@/lib/api/withRateLimit";
import { getDriversForSession } from "@/lib/api/openf1";

function makeRequest() {
  return new Request("http://localhost/api/driver-photos");
}

describe("GET /api/driver-photos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimited).mockReturnValue(null);
  });

  it("returns rate-limit response when blocked", async () => {
    vi.mocked(rateLimited).mockReturnValue(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }),
    );

    const res = await GET(makeRequest());
    expect(res.status).toBe(429);
  });

  it("maps OpenF1 drivers to a slim photo payload", async () => {
    const drivers: Awaited<ReturnType<typeof getDriversForSession>> = [
      {
        driver_number: 1,
        broadcast_name: "M VERSTAPPEN",
        first_name: "Max",
        name_acronym: "VER",
        last_name: "Verstappen",
        full_name: "Max Verstappen",
        team_name: "Red Bull Racing",
        team_colour: "3671C6",
        session_key: 9001,
        meeting_key: 1200,
        headshot_url: "https://media.formula1.com/example/ver.png",
      },
      {
        driver_number: 16,
        broadcast_name: "C LECLERC",
        first_name: "Charles",
        name_acronym: "LEC",
        last_name: "Leclerc",
        full_name: "Charles Leclerc",
        team_name: "Ferrari",
        team_colour: "DC0000",
        session_key: 9001,
        meeting_key: 1200,
      },
    ];
    vi.mocked(getDriversForSession).mockResolvedValue(drivers);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(getDriversForSession).toHaveBeenCalledWith("latest");
    expect(body).toEqual({
      photos: [
        {
          driver_number: 1,
          name_acronym: "VER",
          last_name: "Verstappen",
          headshot_url: "https://media.formula1.com/example/ver.png",
        },
        {
          driver_number: 16,
          name_acronym: "LEC",
          last_name: "Leclerc",
          headshot_url: null,
        },
      ],
    });
  });

  it("degrades gracefully with an empty array when OpenF1 fails", async () => {
    vi.mocked(getDriversForSession).mockRejectedValue(new Error("timeout"));

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ photos: [] });
  });
});
