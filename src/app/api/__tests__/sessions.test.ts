import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(() => null),
}));

vi.mock("@/lib/api/openf1", () => ({
  getSessions: vi.fn(),
  getSessionResult: vi.fn(),
  getStints: vi.fn(),
  getLaps: vi.fn(),
  getPitStops: vi.fn(),
  getTrackWeather: vi.fn(),
  getRaceControl: vi.fn(),
  getDriversForSession: vi.fn(),
}));

import { GET } from "@/app/api/sessions/route";
import {
  getSessions,
  getDriversForSession,
  getLaps,
} from "@/lib/api/openf1";
import { makeApiRequest } from "@/test/api";

describe("GET /api/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for an unknown endpoint", async () => {
    const res = await GET(makeApiRequest("/api/sessions", { endpoint: "made_up" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid endpoint/i);
  });

  it("returns 400 for an invalid year", async () => {
    const res = await GET(makeApiRequest("/api/sessions", { year: "999" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid year/i);
  });

  it("returns 400 when a keyed endpoint is requested without session_key", async () => {
    const res = await GET(makeApiRequest("/api/sessions", { endpoint: "laps" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/session_key required/i);
  });

  it("dispatches the default sessions endpoint", async () => {
    vi.mocked(getSessions).mockResolvedValue([{ session_key: 1 }] as never);
    const res = await GET(makeApiRequest("/api/sessions"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessions).toEqual([{ session_key: 1 }]);
    expect(getSessions).toHaveBeenCalledWith({ meeting_key: "latest" });
  });

  it("dispatches the drivers endpoint when session_key=latest", async () => {
    vi.mocked(getDriversForSession).mockResolvedValue([
      { driver_number: 1, name_acronym: "VER" },
    ] as never);
    const res = await GET(
      makeApiRequest("/api/sessions", { endpoint: "drivers", session_key: "latest" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.drivers).toHaveLength(1);
    expect(getDriversForSession).toHaveBeenCalledWith("latest");
  });

  it("returns 500 when the dispatched handler throws", async () => {
    vi.mocked(getLaps).mockRejectedValue(new Error("upstream"));
    const res = await GET(
      makeApiRequest("/api/sessions", { endpoint: "laps", session_key: "9999" }),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/internal server error/i);
  });
});
