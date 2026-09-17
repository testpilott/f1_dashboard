#!/usr/bin/env tsx
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createConcurrencyLimiter } from "@/lib/api/concurrencyLimiter";
import {
  getDriverStandings,
  getConstructorStandings,
  getSchedule,
  getSeasonResultsFirstPage,
  getSeasonSprintResults,
} from "@/lib/api/jolpica";
import { atomicWriteJson } from "@/lib/snapshots/atomicWriteJson";
import { driverSeasonSummary } from "@/lib/stats/driverSeason";
import { tallySprintWins } from "@/lib/stats/sprintWins";
import type {
  DriverSeasonSnapshot,
  ScheduleSnapshot,
  SeasonResultsSnapshot,
  StandingsSnapshot,
} from "@/lib/snapshots/types";

const SEASONS = ["current"]; // start with the current season only
const OUT_DIR = path.join(process.cwd(), "data", "snapshots");
const snapshotLimiter = createConcurrencyLimiter(1);
const MIN_REQUEST_INTERVAL_MS = 1000;
let nextRequestAt = 0;

async function snapshotFetch<T>(fn: () => Promise<T>): Promise<T> {
  await snapshotLimiter.acquire();
  try {
    const intervalMs = Number(process.env.SNAPSHOT_REQUEST_INTERVAL_MS ?? MIN_REQUEST_INTERVAL_MS);
    const waitMs = Math.max(0, nextRequestAt - Date.now());
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    nextRequestAt = Date.now() + Math.max(0, intervalMs);
    return await fn();
  } finally {
    snapshotLimiter.release();
  }
}

interface SnapshotJob<T> {
  key: string;
  fetch: () => Promise<T>;
}

async function runJob<T>(
  job: SnapshotJob<T>,
): Promise<{ key: string; ok: boolean; err?: string }> {
  try {
    const data = await job.fetch();
    await atomicWriteJson(path.join(OUT_DIR, `${job.key}.json`), data);
    console.log(`✔ ${job.key}`);
    return { key: job.key, ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`✘ ${job.key}: ${msg}`);
    return { key: job.key, ok: false, err: msg };
  }
}

// Run jobs serially — the per-call concurrency limiter (default 2) is
// already enforced inside createApiFetcher. Running jobs serially keeps
// the writer's behavior obvious and well under Jolpica's 4 rps burst.
export async function runDailySnapshot(): Promise<{ key: string; ok: boolean; err?: string }[]> {
  const jobs: SnapshotJob<unknown>[] = [];

  for (const season of SEASONS) {
    jobs.push({
      key: `standings-${season}`,
      fetch: async () => {
        // Sprint tallies are optional enrichment — a sprint fetch failure
        // must not sink the whole standings snapshot.
        const fetchSprintWins = async () => {
          try {
            return tallySprintWins(await snapshotFetch(() => getSeasonSprintResults(season)));
          } catch {
            return null;
          }
        };
        const [drivers, constructors, sprintWins] = await Promise.all([
          snapshotFetch(() => getDriverStandings(season)),
          snapshotFetch(() => getConstructorStandings(season)),
          fetchSprintWins(),
        ]);
        if (drivers.length === 0) throw new Error("empty drivers standings");
        const payload: StandingsSnapshot = {
          drivers,
          constructors,
          sprintWins,
          snapshotAt: new Date().toISOString(),
          source: "jolpica",
        };
        return payload;
      },
    });
    jobs.push({
      key: `schedule-${season}`,
      fetch: async () => {
        const races = await snapshotFetch(() => getSchedule(season));
        if (races.length === 0) throw new Error("empty schedule");
        const payload: ScheduleSnapshot = {
          races,
          snapshotAt: new Date().toISOString(),
          source: "jolpica",
        };
        return payload;
      },
    });
    jobs.push({
      key: `season-results-${season}`,
      fetch: async () => {
        const races = await snapshotFetch(() => getSeasonResultsFirstPage(season));
        const payload: SeasonResultsSnapshot = {
          races,
          snapshotAt: new Date().toISOString(),
          source: "jolpica",
        };
        return payload;
      },
    });
    jobs.push({
      key: `driver-season-${season}`,
      fetch: async () => {
        const [drivers, races] = await Promise.all([
          snapshotFetch(() => getDriverStandings(season)),
          snapshotFetch(() => getSeasonResultsFirstPage(season)),
        ]);
        if (drivers.length === 0) throw new Error("empty drivers standings");

        for (const driver of drivers) {
          const driverId = driver.Driver.driverId;
          const payload: DriverSeasonSnapshot = {
            season,
            driverId,
            summary: driverSeasonSummary(races, driverId),
            snapshotAt: new Date().toISOString(),
            source: "jolpica",
          };
          await atomicWriteJson(path.join(OUT_DIR, `driver-season-${season}-${driverId}.json`), payload);
        }

        return {
          season,
          writtenDrivers: drivers.length,
          snapshotAt: new Date().toISOString(),
          source: "jolpica" as const,
        };
      },
    });
  }

  // Serial, not Promise.all — gentler on Jolpica's 4 rps burst limit and
  // avoids self-induced throttling when the runner IP is already warm.
  const results: { key: string; ok: boolean; err?: string }[] = [];
  for (const job of jobs) {
    results.push(await runJob(job));
  }
  return results;
}

async function main(): Promise<void> {
  const results = await runDailySnapshot();

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(
      `${failed.length} of ${results.length} snapshot jobs failed — exiting non-zero to avoid committing partial snapshots`,
    );
    process.exit(1);
  }
}

// Only run when executed directly (not imported by tests)
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
}
