#!/usr/bin/env tsx
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createConcurrencyLimiter } from "@/lib/api/concurrencyLimiter";
import { atomicWriteJson } from "@/lib/snapshots/atomicWriteJson";
import {
  getDriverCareerWins,
  getDriverCareerP2,
  getDriverCareerP3,
  getDriverCareerStarts,
  getDriverCareerFastestLaps,
  getDriverCareerChampionships,
  getDriverSeasons,
  getAllRaceResultsAtCircuit,
} from "@/lib/api/jolpica";
import { computeCircuitRecords } from "@/lib/stats/circuitRecords";

const OUT_DIR = path.join(process.cwd(), "data", "snapshots");

// Cap to 2 concurrent. createApiFetcher's internal limiter is 2; this keeps
// the writer well below the 4 rps burst even with retries.
const limiter = createConcurrencyLimiter(2);

async function withLimit<T>(fn: () => Promise<T>): Promise<T> {
  await limiter.acquire();
  try {
    return await fn();
  } finally {
    limiter.release();
  }
}

async function snapshotDriverCareer(driverId: string): Promise<void> {
  const [wins, p2, p3, starts, fastestLaps, championships, seasons] = await Promise.all([
    withLimit(() => getDriverCareerWins(driverId)),
    withLimit(() => getDriverCareerP2(driverId)),
    withLimit(() => getDriverCareerP3(driverId)),
    withLimit(() => getDriverCareerStarts(driverId)),
    withLimit(() => getDriverCareerFastestLaps(driverId)),
    withLimit(() => getDriverCareerChampionships(driverId)),
    withLimit(() => getDriverSeasons(driverId)),
  ]);

  await atomicWriteJson(path.join(OUT_DIR, `driver-career-${driverId}.json`), {
    driverId,
    wins,
    p2,
    p3,
    starts,
    fastestLaps,
    championships,
    seasons,
    snapshotAt: new Date().toISOString(),
    source: "jolpica",
  });

  await atomicWriteJson(path.join(OUT_DIR, `driver-seasons-${driverId}.json`), {
    driverId,
    seasons,
    snapshotAt: new Date().toISOString(),
    source: "jolpica",
  });
}

async function snapshotCircuitRecords(circuitId: string): Promise<void> {
  const races = await withLimit(() => getAllRaceResultsAtCircuit(circuitId));
  const records = computeCircuitRecords(races);
  await atomicWriteJson(path.join(OUT_DIR, `circuit-records-${circuitId}.json`), {
    circuitId,
    records,
    raceCount: races.length,
    snapshotAt: new Date().toISOString(),
    source: "jolpica",
  });
}

export interface WeeklySnapshotResult {
  driverErrors: string[];
  circuitErrors: string[];
  driverCount: number;
  circuitCount: number;
}

/**
 * Exported for testing. Reads the daily snapshots to discover driver/circuit
 * lists, then fans out career and circuit-records snapshots.
 */
export async function runWeeklySnapshot(outDir = OUT_DIR): Promise<WeeklySnapshotResult> {
  const standingsRaw = await readFile(path.join(outDir, "standings-current.json"), "utf8");
  const scheduleRaw = await readFile(path.join(outDir, "schedule-current.json"), "utf8");
  const standings = JSON.parse(standingsRaw) as {
    drivers: { Driver: { driverId: string } }[];
  };
  const schedule = JSON.parse(scheduleRaw) as {
    races: { Circuit: { circuitId: string } }[];
  };

  const driverIds = standings.drivers.map((d) => d.Driver.driverId);
  const circuitIds = [...new Set(schedule.races.map((r) => r.Circuit.circuitId))];

  const driverErrors: string[] = [];
  const circuitErrors: string[] = [];

  for (const driverId of driverIds) {
    try {
      await snapshotDriverCareer(driverId);
      console.log(`✔ driver ${driverId}`);
    } catch (err) {
      console.error(`✘ driver ${driverId}:`, err instanceof Error ? err.message : err);
      driverErrors.push(driverId);
    }
  }

  for (const circuitId of circuitIds) {
    try {
      await snapshotCircuitRecords(circuitId);
      console.log(`✔ circuit ${circuitId}`);
    } catch (err) {
      console.error(`✘ circuit ${circuitId}:`, err instanceof Error ? err.message : err);
      circuitErrors.push(circuitId);
    }
  }

  console.log(
    `Summary: ${driverIds.length - driverErrors.length}/${driverIds.length} drivers, ` +
      `${circuitIds.length - circuitErrors.length}/${circuitIds.length} circuits`,
  );

  return { driverErrors, circuitErrors, driverCount: driverIds.length, circuitCount: circuitIds.length };
}

async function main(): Promise<void> {
  await runWeeklySnapshot();
}

// Only run when executed directly (not imported by tests)
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\.ts$/, ".ts"))) {
  main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
}
