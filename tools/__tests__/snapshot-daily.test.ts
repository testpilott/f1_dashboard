import { beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";

// Mock atomicWriteJson to capture what would be written
const { mockAtomicWriteJson } = vi.hoisted(() => ({
  mockAtomicWriteJson: vi.fn(),
}));
vi.mock("@/lib/snapshots/atomicWriteJson", () => ({
  atomicWriteJson: mockAtomicWriteJson,
}));

// Mock Jolpica fetchers
const jolpica = vi.hoisted(() => ({
  getDriverStandings: vi.fn(),
  getConstructorStandings: vi.fn(),
  getSchedule: vi.fn(),
  getSeasonResultsFirstPage: vi.fn(),
}));
const mockGetDriverStandings = jolpica.getDriverStandings;
const mockGetConstructorStandings = jolpica.getConstructorStandings;
const mockGetSchedule = jolpica.getSchedule;
const mockGetSeasonResults = jolpica.getSeasonResultsFirstPage;

vi.mock("@/lib/api/jolpica", async () => {
  const { createJolpicaMocks } = await import("@/test/mockJolpica");
  return { ...createJolpicaMocks(), ...jolpica };
});

// Shared test fixtures
const driverStandingFixture = [{ position: "1", Driver: { driverId: "verstappen" } }];
const constructorStandingFixture = [{ position: "1", Constructor: { constructorId: "red_bull" } }];
const scheduleFixture = [{ round: "1", raceName: "Bahrain Grand Prix" }];
const resultsFixture = [{ round: "1", Results: [{ position: "1" }] }];

describe("snapshot-daily writer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAtomicWriteJson.mockResolvedValue(undefined);
    mockGetDriverStandings.mockResolvedValue(driverStandingFixture);
    mockGetConstructorStandings.mockResolvedValue(constructorStandingFixture);
    mockGetSchedule.mockResolvedValue(scheduleFixture);
    mockGetSeasonResults.mockResolvedValue(resultsFixture);
  });

  it("writes standings, schedule, season-results, and driver-season files on success", async () => {
    const { runDailySnapshot } = await import("../snapshot-daily");
    const results = await runDailySnapshot();

    expect(results).toHaveLength(4);
    expect(results.every((r) => r.ok)).toBe(true);

    const writtenKeys = mockAtomicWriteJson.mock.calls.map((call) =>
      path.basename(String(call[0]), ".json"),
    );
    expect(writtenKeys).toContain("standings-current");
    expect(writtenKeys).toContain("schedule-current");
    expect(writtenKeys).toContain("season-results-current");
    expect(writtenKeys).toContain("driver-season-current-verstappen");
  });

  it("one failing job does not stop the others — remaining jobs still write", async () => {
    mockGetDriverStandings.mockRejectedValue(new Error("Jolpica 429"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { runDailySnapshot } = await import("../snapshot-daily");
    const results = await runDailySnapshot();

    const failed = results.filter((r) => !r.ok);
    const passed = results.filter((r) => r.ok);
    expect(failed.length).toBe(2);
    expect(passed.length).toBe(2);

    // schedule and season-results should still have been written
    const writtenKeys = mockAtomicWriteJson.mock.calls.map((call) =>
      path.basename(String(call[0]), ".json"),
    );
    expect(writtenKeys).toContain("schedule-current");
    expect(writtenKeys).toContain("season-results-current");
    consoleSpy.mockRestore();
  });

  it("all jobs failing returns all results as failed", async () => {
    mockGetDriverStandings.mockRejectedValue(new Error("down"));
    mockGetSchedule.mockRejectedValue(new Error("down"));
    mockGetSeasonResults.mockRejectedValue(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { runDailySnapshot } = await import("../snapshot-daily");
    const results = await runDailySnapshot();

    expect(results.every((r) => !r.ok)).toBe(true);
    expect(mockAtomicWriteJson).not.toHaveBeenCalled();
  });

  it("writes a per-driver current season summary snapshot payload", async () => {
    const { runDailySnapshot } = await import("../snapshot-daily");
    await runDailySnapshot();

    const driverSeasonCall = mockAtomicWriteJson.mock.calls.find((call) =>
      String(call[0]).includes("driver-season-current-verstappen"),
    );
    expect(driverSeasonCall).toBeTruthy();
    const [, data] = driverSeasonCall as [string, Record<string, unknown>];
    expect(data.season).toBe("current");
    expect(data.driverId).toBe("verstappen");
    expect(data.summary).toBeTruthy();
    expect(data.source).toBe("jolpica");
  });

  it("writes a driver-season file for every driver in the standings", async () => {
    mockGetDriverStandings.mockResolvedValue([
      { position: "1", Driver: { driverId: "verstappen" } },
      { position: "2", Driver: { driverId: "hamilton" } },
    ]);

    const { runDailySnapshot } = await import("../snapshot-daily");
    await runDailySnapshot();

    const written = mockAtomicWriteJson.mock.calls.map((call) => String(call[0]));
    expect(written.some((p) => p.includes("driver-season-current-verstappen"))).toBe(true);
    expect(written.some((p) => p.includes("driver-season-current-hamilton"))).toBe(true);
  });

  it("fails the driver-season job without writing partial files when standings are empty", async () => {
    mockGetDriverStandings.mockResolvedValue([]);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { runDailySnapshot } = await import("../snapshot-daily");
    const results = await runDailySnapshot();

    const driverSeason = results.find((r) => r.key === "driver-season-current");
    expect(driverSeason?.ok).toBe(false);
    expect(driverSeason?.err).toMatch(/empty drivers/i);

    const written = mockAtomicWriteJson.mock.calls.map((call) => String(call[0]));
    expect(written.some((p) => p.includes("driver-season-current-"))).toBe(false);
  });
});
