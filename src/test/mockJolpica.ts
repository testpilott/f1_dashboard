import { vi } from "vitest";

/** Call inside vi.hoisted(); spread or return into vi.mock("@/lib/api/jolpica"). */
export function createJolpicaMocks() {
  return {
    getDriverStandings: vi.fn(),
    getConstructorStandings: vi.fn(),
    getSchedule: vi.fn(),
    getRaceResults: vi.fn(),
    getQualifyingResults: vi.fn(),
    getSprintResults: vi.fn(),
    getSeasonResults: vi.fn(),
    getSeasonRaceResults: vi.fn(),
    getRaceResultsAtCircuit: vi.fn(),
    getQualifyingResultsAtCircuit: vi.fn(),
    getDriverCareerWins: vi.fn(),
    getDriverCareerP2: vi.fn(),
    getDriverCareerP3: vi.fn(),
    getDriverCareerStarts: vi.fn(),
    getDriverCareerFastestLaps: vi.fn(),
    getDriverCareerChampionships: vi.fn(),
    getDriverSeasons: vi.fn(),
    getAllRaceResultsAtCircuit: vi.fn(),
    getRaceLaps: vi.fn(),
    getRacePitstops: vi.fn(),
    getNextRace: vi.fn(),
    getLastRace: vi.fn(),
  };
}