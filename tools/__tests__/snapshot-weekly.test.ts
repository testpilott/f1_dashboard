import { beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";
import os from "node:os";

// Mock atomicWriteJson
const { mockAtomicWriteJson } = vi.hoisted(() => ({
  mockAtomicWriteJson: vi.fn(),
}));
vi.mock("@/lib/snapshots/atomicWriteJson", () => ({
  atomicWriteJson: mockAtomicWriteJson,
}));

// Mock Jolpica fetchers
const jolpica = vi.hoisted(() => ({
  getDriverCareerWins: vi.fn(),
  getDriverCareerP2: vi.fn(),
  getDriverCareerP3: vi.fn(),
  getDriverCareerStarts: vi.fn(),
  getDriverCareerFastestLaps: vi.fn(),
  getDriverCareerChampionships: vi.fn(),
  getDriverSeasons: vi.fn(),
  getSeasonRaceResults: vi.fn(),
  getAllRaceResultsAtCircuit: vi.fn(),
}));
const mockGetDriverCareerWins = jolpica.getDriverCareerWins;
const mockGetDriverCareerP2 = jolpica.getDriverCareerP2;
const mockGetDriverCareerP3 = jolpica.getDriverCareerP3;
const mockGetDriverCareerStarts = jolpica.getDriverCareerStarts;
const mockGetDriverCareerFastestLaps = jolpica.getDriverCareerFastestLaps;
const mockGetDriverCareerChampionships = jolpica.getDriverCareerChampionships;
const mockGetDriverSeasons = jolpica.getDriverSeasons;
const mockGetSeasonRaceResults = jolpica.getSeasonRaceResults;
const mockGetAllRaceResultsAtCircuit = jolpica.getAllRaceResultsAtCircuit;

vi.mock("@/lib/api/jolpica", async () => {
  const { createJolpicaMocks } = await import("@/test/mockJolpica");
  return { ...createJolpicaMocks(), ...jolpica };
});

// Mock circuitRecords compute
const { mockComputeCircuitRecords } = vi.hoisted(() => ({
  mockComputeCircuitRecords: vi.fn(),
}));
vi.mock("@/lib/stats/circuitRecords", () => ({
  computeCircuitRecords: mockComputeCircuitRecords,
}));

// We'll write real fixture files to a temp dir and pass that to runWeeklySnapshot
import { writeFile, mkdir } from "node:fs/promises";
import { runWeeklySnapshot } from "../snapshot-weekly";
import type { DriverCareerSnapshot, DriverSeasonSnapshot } from "@/lib/snapshots/types";

const standings = {
  drivers: [
    { Driver: { driverId: "verstappen" } },
    { Driver: { driverId: "norris" } },
    { Driver: { driverId: "piastri" } },
  ],
  constructors: [],
  snapshotAt: "2026-06-01T05:00:00Z",
  source: "jolpica",
};

const schedule = {
  races: [
    { Circuit: { circuitId: "bahrain" } },
    { Circuit: { circuitId: "jeddah" } },
    { Circuit: { circuitId: "bahrain" } }, // duplicate — should dedupe
  ],
  snapshotAt: "2026-06-01T05:00:00Z",
  source: "jolpica",
};

async function writeTempSnapshots(dir: string) {
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "standings-current.json"),
    JSON.stringify(standings) + "\n",
    "utf8",
  );
  await writeFile(
    path.join(dir, "schedule-current.json"),
    JSON.stringify(schedule) + "\n",
    "utf8",
  );
}

describe("snapshot-weekly writer", () => {
  let tempDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    tempDir = path.join(os.tmpdir(), `snapshot-weekly-test-${Date.now()}`);
    await writeTempSnapshots(tempDir);
    mockAtomicWriteJson.mockResolvedValue(undefined);
    mockGetDriverCareerWins.mockResolvedValue("10");
    mockGetDriverCareerP2.mockResolvedValue("20");
    mockGetDriverCareerP3.mockResolvedValue("15");
    mockGetDriverCareerStarts.mockResolvedValue("100");
    mockGetDriverCareerFastestLaps.mockResolvedValue("5");
    mockGetDriverCareerChampionships.mockResolvedValue("4");
    mockGetDriverSeasons.mockResolvedValue([2021, 2022, 2023, 2024, 2025]);
    mockGetSeasonRaceResults.mockResolvedValue([]);
    mockGetAllRaceResultsAtCircuit.mockResolvedValue([]);
    mockComputeCircuitRecords.mockReturnValue({});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("writes driver-career and driver-season files for all 3 drivers and 2 unique circuits", async () => {
    const result = await runWeeklySnapshot(tempDir);

    expect(result.driverCount).toBe(5);
    expect(result.circuitCount).toBe(2); // deduplicated
    expect(result.driverErrors).toHaveLength(0);
    expect(result.circuitErrors).toHaveLength(0);

    // 2 writes per driver (career + season summary) + 1 per circuit
    expect(mockAtomicWriteJson).toHaveBeenCalledTimes(5 * 2 + 2);

    // driver-season snapshot must match /api/driver-season's `{ season,
    // driverId, summary }` shape so the UI's `data.summary.rows` resolves.
    const seasonCall = mockAtomicWriteJson.mock.calls.find(
      (call) => typeof call[0] === "string" && call[0].includes("driver-season-current-verstappen"),
    );
    expect(seasonCall).toBeDefined();
    const seasonPayload = seasonCall![1] as DriverSeasonSnapshot;
    expect(seasonPayload.season).toBe("current");
    expect(seasonPayload.driverId).toBe("verstappen");
    expect(seasonPayload.summary.rows).toEqual([]);
    expect(seasonPayload.source).toBe("jolpica");

    // driver-career snapshot must match the route's `{ driverId, career }`
    // shape (NOT a flat object) so consumers can read `payload.career.*`.
    const careerCall = mockAtomicWriteJson.mock.calls.find(
      (call) => typeof call[0] === "string" && call[0].includes("driver-career-verstappen"),
    );
    expect(careerCall).toBeDefined();
    const careerPayload = careerCall![1] as {
      driverId: string;
      career: { wins: number | null; podiums: number | null; championships: number | null };
      seasons: number[];
    };
    const _shapeCheck: DriverCareerSnapshot = careerCall![1] as DriverCareerSnapshot;
    expect(_shapeCheck.source).toBe("jolpica");
    expect(careerPayload.driverId).toBe("verstappen");
    expect(careerPayload.career).toMatchObject({
      wins: 10,
      podiums: 45, // wins(10) + p2(20) + p3(15)
      starts: 100,
      fastestLaps: 5,
      championships: 4,
    });
    expect(careerPayload.seasons).toEqual([2021, 2022, 2023, 2024, 2025]);

    const writtenPaths = mockAtomicWriteJson.mock.calls.map((call) => String(call[0]));
    expect(writtenPaths.some((p) => p.includes("driver-career-hamilton"))).toBe(true);
    expect(writtenPaths.some((p) => p.includes("driver-career-max_verstappen"))).toBe(true);
  });

  it("a single failing driver does not stop the other drivers or circuits", async () => {
    mockGetDriverCareerWins.mockRejectedValueOnce(new Error("timeout"));

    const result = await runWeeklySnapshot(tempDir);

    expect(result.driverErrors).toHaveLength(1);
    expect(result.driverErrors[0]).toBeTruthy();
    // Other drivers still processed
    const writtenPaths = mockAtomicWriteJson.mock.calls.map((call) => String(call[0]));
    expect(writtenPaths.some((p) => p.includes("driver-career-norris"))).toBe(true);
    expect(writtenPaths.some((p) => p.includes("driver-career-piastri"))).toBe(true);
    // Circuits still processed
    expect(result.circuitErrors).toHaveLength(0);
  });

  it("throws with a clear error when standings-current.json is missing", async () => {
    const emptyDir = path.join(os.tmpdir(), `snapshot-weekly-empty-${Date.now()}`);
    await mkdir(emptyDir, { recursive: true });

    await expect(runWeeklySnapshot(emptyDir)).rejects.toThrow(/ENOENT|no such file/i);
  });
});
