import type { DriverStanding, ConstructorStanding, Race } from "@/lib/types";
import type { DriverCareerStats } from "@/lib/stats/driverCareer";
import type { CircuitRecords } from "@/lib/stats/circuitRecords";

export type SnapshotSource = "jolpica" | "live";

export interface SnapshotMeta {
  snapshotAt: string;
  source: SnapshotSource;
}

export interface StandingsSnapshot extends SnapshotMeta {
  drivers: DriverStanding[];
  constructors: ConstructorStanding[];
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

export interface DriverSeasonsSnapshot extends SnapshotMeta {
  driverId: string;
  seasons: number[];
}

export interface CircuitRecordsSnapshot extends SnapshotMeta {
  circuitId: string;
  records: CircuitRecords;
  raceCount: number;
}