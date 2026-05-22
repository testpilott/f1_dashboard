import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(() => null),
}));

vi.mock("@/lib/api/openmeteo", () => ({
  getWeatherForecast: vi.fn(),
}));

vi.mock("@/lib/constants", () => ({
  CIRCUIT_COORDS: {
    Monaco: { lat: 43.7384, lng: 7.4246, timezone: "Europe/Monaco" },
  },
}));

import { GET } from "@/app/api/weather/route";
import { getWeatherForecast } from "@/lib/api/openmeteo";
import { makeApiRequest } from "@/test/api";

const FORECAST = {
  current: { temperature_2m: 22 },
  hourly: { time: [], temperature_2m: [] },
};

describe("GET /api/weather", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when neither country nor lat/lng are provided", async () => {
    const res = await GET(makeApiRequest("/api/weather"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/country or lat\/lng required/i);
  });

  it("returns 400 for an unknown country", async () => {
    const res = await GET(makeApiRequest("/api/weather", { country: "Atlantis" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/unknown circuit country/i);
  });

  it("returns 400 for non-numeric coordinates", async () => {
    const res = await GET(
      makeApiRequest("/api/weather", { lat: "foo", lng: "bar" }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid coordinates/i);
  });

  it("returns the forecast for a known country", async () => {
    vi.mocked(getWeatherForecast).mockResolvedValue(FORECAST as never);
    const res = await GET(makeApiRequest("/api/weather", { country: "Monaco" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.current.temperature_2m).toBe(22);
    expect(getWeatherForecast).toHaveBeenCalledWith(43.7384, 7.4246, "Europe/Monaco");
  });

  it("returns 500 when the upstream forecast fetch fails", async () => {
    vi.mocked(getWeatherForecast).mockRejectedValue(new Error("upstream"));
    const res = await GET(makeApiRequest("/api/weather", { country: "Monaco" }));
    expect(res.status).toBe(500);
  });
});
