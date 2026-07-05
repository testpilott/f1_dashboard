import type { DriverStanding, ConstructorStanding, Race } from "@/lib/types";
import type { DriverCareerStats } from "@/lib/stats/driverCareer";
import type { DriverSeasonSummary } from "@/lib/stats/driverSeason";
import type { CircuitRecords } from "@/lib/stats/circuitRecords";
import type { SprintWinTallies } from "@/lib/stats/sprintWins";

export type SnapshotSource = "jolpica" | "live";

export interface SnapshotMeta {
  snapshotAt: string;
  source: SnapshotSource;
}

export interface StandingsSnapshot extends SnapshotMeta {
  drivers: DriverStanding[];
  constructors: ConstructorStanding[];
  /**
   * Optional enrichment — sprint-win tallies for the season. Absent in
   * snapshots written before this field existed; null when the sprint
   * fetch failed at snapshot time. UI hides the element in both cases.
   */
  sprintWins?: SprintWinTallies | null;
}

export interface ScheduleSnapshot extends SnapshotMeta {
  races: Race[];
}

export interface SeasonResultsSnapshot extends SnapshotMeta {
  races: Race[];
}

export interface DriverCareerSnapshot extends SnapshotMeta {
  driverId: string;
  career: DriverCareerStats;
  seasons: number[];
}

export interface DriverSeasonSnapshot extends SnapshotMeta {
  season: string;
  driverId: string;
  summary: DriverSeasonSummary;
}

export interface CircuitRecordsSnapshot extends SnapshotMeta {
  circuitId: string;
  records: CircuitRecords;
  raceCount: number;
}