import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockReadSnapshotOrFetch } = vi.hoisted(() => ({
  mockReadSnapshotOrFetch: vi.fn(),
}));

vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(() => null),
}));

vi.mock("@/lib/snapshots/readSnapshotOrFetch", () => ({
  readSnapshotOrFetch: mockReadSnapshotOrFetch,
}));

vi.mock("@/lib/api/jolpica", () => ({
  getSchedule: vi.fn(),
  getNextRace: vi.fn(),
  getLastRace: vi.fn(),
}));

import { GET } from "@/app/api/schedule/route";
import { getLastRace, getNextRace } from "@/lib/api/jolpica";
import { makeApiRequest } from "@/test/api";

const MOCK_RACE = {
  season: "2026",
  round: "8",
  raceName: "Monaco Grand Prix",
  Circuit: {
    circuitId: "monaco",
    circuitName: "Circuit de Monaco",
    Location: { locality: "Monte-Carlo", country: "Monaco" },
  },
  date: "2026-05-24",
  time: "13:00:00Z",
};

describe("GET /api/schedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for an invalid season", async () => {
    const res = await GET(makeApiRequest("/api/schedule", { season: "bad" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/invalid season/i);
  });

  it("returns races from snapshot on the default schedule view", async () => {
    mockReadSnapshotOrFetch.mockResolvedValue({
      races: [MOCK_RACE],
      snapshotAt: "2026-01-01T00:00:00.000Z",
      source: "snapshot",
    });

    const res = await GET(makeApiRequest("/api/schedule", { season: "2026" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockReadSnapshotOrFetch).toHaveBeenCalledWith(
      expect.objectContaining({ key: "schedule-2026", dataClass: "seasonSchedule" })
    );
    expect(body.races).toHaveLength(1);
    expect(body.races[0].raceName).toBe("Monaco Grand Prix");
  });

  it("returns the next race when view=next", async () => {
    vi.mocked(getNextRace).mockResolvedValue(MOCK_RACE as never);

    const res = await GET(makeApiRequest("/api/schedule", { view: "next" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.race.raceName).toBe("Monaco Grand Prix");
  });

  it("returns 500 when the schedule snapshot and live both fail", async () => {
    mockReadSnapshotOrFetch.mockRejectedValue(new Error("timeout"));

    const res = await GET(makeApiRequest("/api/schedule", { season: "2026" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatch(/internal server error/i);
  });

  it("returns 500 when the last-race view fails", async () => {
    vi.mocked(getLastRace).mockRejectedValue(new Error("timeout"));

    const res = await GET(makeApiRequest("/api/schedule", { view: "last" }));
    expect(res.status).toBe(500);
  });
});