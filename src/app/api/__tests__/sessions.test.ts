import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(),
}));

vi.mock("@/lib/api/openf1", () => ({
  getSessions: vi.fn(),
  getDriversForSession: vi.fn(),
  getSessionResult: vi.fn(),
  getLaps: vi.fn(),
  getStints: vi.fn(),
  getPitStops: vi.fn(),
  getTrackWeather: vi.fn(),
  getRaceControl: vi.fn(),
}));

import { rateLimited } from "@/lib/api/withRateLimit";
import {
  getSessions,
  getDriversForSession,
  getSessionResult,
  getLaps,
  getStints,
  getPitStops,
  getTrackWeather,
  getRaceControl,
} from "@/lib/api/openf1";
import { GET as legacyGET } from "@/app/api/sessions/route";
import { GET as infoGET } from "@/app/api/sessions/info/route";
import { GET as driversGET } from "@/app/api/sessions/drivers/route";
import { GET as resultGET } from "@/app/api/sessions/result/route";
import { GET as lapsGET } from "@/app/api/sessions/laps/route";
import { GET as stintsGET } from "@/app/api/sessions/stints/route";
import { GET as pitGET } from "@/app/api/sessions/pit/route";
import { GET as weatherGET } from "@/app/api/sessions/weather/route";
import { GET as raceControlGET } from "@/app/api/sessions/race-control/route";
import { makeApiRequest } from "@/test/api";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(rateLimited).mockReturnValue(null);
});

describe("GET /api/sessions (legacy shim)", () => {
  it("redirects 308 to /api/sessions/laps with preserved query", async () => {
    const res = await legacyGET(
      makeApiRequest("/api/sessions", { endpoint: "laps", session_key: "9001" }),
    );
    expect(res.status).toBe(308);
    const location = res.headers.get("location");
    expect(location).toContain("/api/sessions/laps");
    expect(location).toContain("session_key=9001");
    expect(location).not.toContain("endpoint=");
  });

  it("maps endpoint=sessions to /api/sessions/info", async () => {
    const res = await legacyGET(
      makeApiRequest("/api/sessions", { endpoint: "sessions", year: "2026" }),
    );
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toContain("/api/sessions/info");
  });

  it("returns 400 for unknown endpoint", async () => {
    const res = await legacyGET(makeApiRequest("/api/sessions", { endpoint: "bogus" }));
    expect(res.status).toBe(400);
  });

  it("returns rate-limit response when blocked", async () => {
    vi.mocked(rateLimited).mockReturnValue(
      new Response(JSON.stringify({ error: "rl" }), { status: 429 }),
    );
    const res = await legacyGET(makeApiRequest("/api/sessions", { endpoint: "laps" }));
    expect(res.status).toBe(429);
  });
});

describe("GET /api/sessions/info", () => {
  it("rejects malformed year", async () => {
    const res = await infoGET(makeApiRequest("/api/sessions/info", { year: "20xx" }));
    expect(res.status).toBe(400);
  });

  it("defaults to meeting_key=latest when nothing is provided", async () => {
    vi.mocked(getSessions).mockResolvedValue([] as unknown as Awaited<ReturnType<typeof getSessions>>);
    const res = await infoGET(makeApiRequest("/api/sessions/info"));
    expect(res.status).toBe(200);
    expect(getSessions).toHaveBeenCalledWith({ meeting_key: "latest" });
  });

  it("forwards year filter", async () => {
    vi.mocked(getSessions).mockResolvedValue([] as unknown as Awaited<ReturnType<typeof getSessions>>);
    const res = await infoGET(makeApiRequest("/api/sessions/info", { year: "2026" }));
    expect(res.status).toBe(200);
    expect(getSessions).toHaveBeenCalledWith({ year: "2026" });
  });

  it("returns 500 when upstream throws", async () => {
    vi.mocked(getSessions).mockRejectedValue(new Error("down"));
    const res = await infoGET(makeApiRequest("/api/sessions/info"));
    expect(res.status).toBe(500);
  });
});

describe("session-keyed routes share validation behavior", () => {
  it("rejects missing session_key (laps)", async () => {
    const res = await lapsGET(makeApiRequest("/api/sessions/laps"));
    expect(res.status).toBe(400);
  });

  it("rejects malformed session_key (drivers)", async () => {
    const res = await driversGET(makeApiRequest("/api/sessions/drivers", { session_key: "abc" }));
    expect(res.status).toBe(400);
  });

  it("rejects session_key=latest where not allowed (stints)", async () => {
    const res = await stintsGET(makeApiRequest("/api/sessions/stints", { session_key: "latest" }));
    expect(res.status).toBe(400);
  });

  it("allows session_key=latest for drivers", async () => {
    vi.mocked(getDriversForSession).mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof getDriversForSession>>,
    );
    const res = await driversGET(makeApiRequest("/api/sessions/drivers", { session_key: "latest" }));
    expect(res.status).toBe(200);
    expect(getDriversForSession).toHaveBeenCalledWith("latest");
  });
});

describe("session-keyed routes — happy paths", () => {
  it("returns laps", async () => {
    vi.mocked(getLaps).mockResolvedValue(
      [{ lap_number: 1 }] as unknown as Awaited<ReturnType<typeof getLaps>>,
    );
    const res = await lapsGET(makeApiRequest("/api/sessions/laps", { session_key: "9001" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ laps: [{ lap_number: 1 }] });
    expect(getLaps).toHaveBeenCalledWith(9001);
  });

  it("returns result", async () => {
    vi.mocked(getSessionResult).mockResolvedValue(
      [{ position: 1 }] as unknown as Awaited<ReturnType<typeof getSessionResult>>,
    );
    const res = await resultGET(makeApiRequest("/api/sessions/result", { session_key: "9001" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ results: [{ position: 1 }] });
  });

  it("returns stints", async () => {
    vi.mocked(getStints).mockResolvedValue(
      [{ stint_number: 1 }] as unknown as Awaited<ReturnType<typeof getStints>>,
    );
    const res = await stintsGET(makeApiRequest("/api/sessions/stints", { session_key: "9001" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ stints: [{ stint_number: 1 }] });
  });

  it("returns pit stops", async () => {
    vi.mocked(getPitStops).mockResolvedValue(
      [{ lap_number: 18 }] as unknown as Awaited<ReturnType<typeof getPitStops>>,
    );
    const res = await pitGET(makeApiRequest("/api/sessions/pit", { session_key: "9001" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ pit: [{ lap_number: 18 }] });
  });

  it("returns weather", async () => {
    vi.mocked(getTrackWeather).mockResolvedValue(
      [{ air_temperature: 22 }] as unknown as Awaited<ReturnType<typeof getTrackWeather>>,
    );
    const res = await weatherGET(makeApiRequest("/api/sessions/weather", { session_key: "9001" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ weather: [{ air_temperature: 22 }] });
  });

  it("returns race control", async () => {
    vi.mocked(getRaceControl).mockResolvedValue(
      [{ message: "Yellow flag" }] as unknown as Awaited<ReturnType<typeof getRaceControl>>,
    );
    const res = await raceControlGET(
      makeApiRequest("/api/sessions/race-control", { session_key: "9001" }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ raceControl: [{ message: "Yellow flag" }] });
  });

  it("returns 500 when upstream throws (laps)", async () => {
    vi.mocked(getLaps).mockRejectedValue(new Error("openf1 down"));
    const res = await lapsGET(makeApiRequest("/api/sessions/laps", { session_key: "9001" }));
    expect(res.status).toBe(500);
  });
});
