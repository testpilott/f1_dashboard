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
const {
  mockGetDriverCareerWins,
  mockGetDriverCareerP2,
  mockGetDriverCareerP3,
  mockGetDriverCareerStarts,
  mockGetDriverCareerFastestLaps,
  mockGetDriverCareerChampionships,
  mockGetDriverSeasons,
  mockGetAllRaceResultsAtCircuit,
} = vi.hoisted(() => ({
  mockGetDriverCareerWins: vi.fn(),
  mockGetDriverCareerP2: vi.fn(),
  mockGetDriverCareerP3: vi.fn(),
  mockGetDriverCareerStarts: vi.fn(),
  mockGetDriverCareerFastestLaps: vi.fn(),
  mockGetDriverCareerChampionships: vi.fn(),
  mockGetDriverSeasons: vi.fn(),
  mockGetAllRaceResultsAtCircuit: vi.fn(),
}));

vi.mock("@/lib/api/jolpica", () => ({
  getDriverCareerWins: mockGetDriverCareerWins,
  getDriverCareerP2: mockGetDriverCareerP2,
  getDriverCareerP3: mockGetDriverCareerP3,
  getDriverCareerStarts: mockGetDriverCareerStarts,
  getDriverCareerFastestLaps: mockGetDriverCareerFastestLaps,
  getDriverCareerChampionships: mockGetDriverCareerChampionships,
  getDriverSeasons: mockGetDriverSeasons,
  getAllRaceResultsAtCircuit: mockGetAllRaceResultsAtCircuit,
}));

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
    mockGetAllRaceResultsAtCircuit.mockResolvedValue([]);
    mockComputeCircuitRecords.mockReturnValue({});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("writes driver-career and driver-seasons files for all 3 drivers and 2 unique circuits", async () => {
    const result = await runWeeklySnapshot(tempDir);

    expect(result.driverCount).toBe(3);
    expect(result.circuitCount).toBe(2); // deduplicated
    expect(result.driverErrors).toHaveLength(0);
    expect(result.circuitErrors).toHaveLength(0);

    // 2 writes per driver (career + seasons) + 1 per circuit
    expect(mockAtomicWriteJson).toHaveBeenCalledTimes(3 * 2 + 2);

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
    expect(careerPayload.driverId).toBe("verstappen");
    expect(careerPayload.career).toMatchObject({
      wins: 10,
      podiums: 45, // wins(10) + p2(20) + p3(15)
      starts: 100,
      fastestLaps: 5,
      championships: 4,
    });
    expect(careerPayload.seasons).toEqual([2021, 2022, 2023, 2024, 2025]);
  });

  it("a single failing driver does not stop the other drivers or circuits", async () => {
    mockGetDriverCareerWins.mockRejectedValueOnce(new Error("timeout"));

    const result = await runWeeklySnapshot(tempDir);

    expect(result.driverErrors).toHaveLength(1);
    expect(result.driverErrors[0]).toBe("verstappen"); // first driver
    // Other drivers still processed
    const writtenPaths = mockAtomicWriteJson.mock.calls.map(([fp]: [string]) => fp);
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
