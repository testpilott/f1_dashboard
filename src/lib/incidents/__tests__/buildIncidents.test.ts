import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/openf1", () => ({
  getSessions: vi.fn(),
  getRaceControl: vi.fn(),
  getLocations: vi.fn(),
}));

vi.mock("@/lib/stats/session-match", () => ({
  pickRaceSession: vi.fn(),
}));

vi.mock("@/lib/stats/incidents", () => ({
  classifyIncidents: vi.fn(),
  closestByTime: vi.fn(),
}));

import { computeIncidentsForRace } from "@/lib/incidents/buildIncidents";
import { getLocations, getRaceControl, getSessions } from "@/lib/api/openf1";
import { classifyIncidents, closestByTime } from "@/lib/stats/incidents";
import { pickRaceSession } from "@/lib/stats/session-match";

const MOCK_INCIDENT = {
  date: "2026-06-09T10:00:10.000Z",
  driver_number: 44,
  lap_number: 33,
  flag: "YELLOW",
  category: "CarEvent",
  message: "Car 44 stopped in Turn 4",
};

describe("computeIncidentsForRace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSessions).mockResolvedValue(
      [{ session_key: 9001 }] as unknown as Awaited<ReturnType<typeof getSessions>>,
    );
    vi.mocked(pickRaceSession).mockReturnValue(9001);
    vi.mocked(getRaceControl).mockResolvedValue(
      [{ category: "CarEvent" }] as unknown as Awaited<ReturnType<typeof getRaceControl>>,
    );
    vi.mocked(classifyIncidents).mockReturnValue(
      [MOCK_INCIDENT] as unknown as ReturnType<typeof classifyIncidents>,
    );
    vi.mocked(getLocations).mockResolvedValue(
      [{ x: 11, y: -9, date: MOCK_INCIDENT.date }] as unknown as Awaited<
        ReturnType<typeof getLocations>
      >,
    );
    vi.mocked(closestByTime).mockReturnValue(
      { x: 11, y: -9 } as unknown as ReturnType<typeof closestByTime>,
    );
  });

  it("returns available=false when no race session can be matched", async () => {
    vi.mocked(pickRaceSession).mockReturnValue(null);
    const result = await computeIncidentsForRace("2026", "Canada");
    expect(result).toEqual({
      available: false,
      reason: "OpenF1 covers 2023+ only",
    });
    expect(getRaceControl).not.toHaveBeenCalled();
  });

  it("returns mapped incidents with x/y on success", async () => {
    const result = await computeIncidentsForRace("2026", "Canada");
    expect(result.available).toBe(true);
    if (!result.available) return;
    expect(result.incidents).toEqual([
      {
        x: 11,
        y: -9,
        lap_number: 33,
        driver_number: 44,
        flag: "YELLOW",
        category: "CarEvent",
        message: "Car 44 stopped in Turn 4",
      },
    ]);
    expect(getLocations).toHaveBeenCalledWith(
      9001,
      44,
      "2026-06-09T10:00:06.000Z",
      "2026-06-09T10:00:14.000Z",
    );
  });

  it("keeps incident payload with x/y=null when getLocations fails", async () => {
    vi.mocked(getLocations).mockRejectedValue(new Error("location API timeout"));
    const result = await computeIncidentsForRace("2026", "Canada");
    expect(result.available).toBe(true);
    if (!result.available) return;
    expect(result.incidents[0]).toMatchObject({ x: null, y: null, driver_number: 44 });
  });

  it("treats getSessions failure as no available session and degrades gracefully", async () => {
    vi.mocked(getSessions).mockRejectedValue(new Error("openf1 down"));
    vi.mocked(pickRaceSession).mockReturnValueOnce(null);
    const result = await computeIncidentsForRace("2026", "Canada");
    expect(result.available).toBe(false);
  });
});
