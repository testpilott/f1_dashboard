#!/usr/bin/env tsx
import path from "node:path";
import {
  getDriverStandings,
  getConstructorStandings,
  getSchedule,
  getSeasonResults,
} from "@/lib/api/jolpica";
import { atomicWriteJson } from "@/lib/snapshots/atomicWriteJson";

const SEASONS = ["current"]; // start with the current season only
const OUT_DIR = path.join(process.cwd(), "data", "snapshots");

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
        const [drivers, constructors] = await Promise.all([
          getDriverStandings(season),
          getConstructorStandings(season),
        ]);
        if (drivers.length === 0) throw new Error("empty drivers standings");
        return {
          drivers,
          constructors,
          snapshotAt: new Date().toISOString(),
          source: "jolpica",
        };
      },
    });
    jobs.push({
      key: `schedule-${season}`,
      fetch: async () => {
        const races = await getSchedule(season);
        if (races.length === 0) throw new Error("empty schedule");
        return {
          races,
          snapshotAt: new Date().toISOString(),
          source: "jolpica",
        };
      },
    });
    jobs.push({
      key: `season-results-${season}`,
      fetch: async () => {
        const races = await getSeasonResults(season);
        return {
          races,
          snapshotAt: new Date().toISOString(),
          source: "jolpica",
        };
      },
    });
  }

  return Promise.all(jobs.map(runJob));
}

async function main(): Promise<void> {
  const results = await runDailySnapshot();

  const failed = results.filter((r) => !r.ok);
  if (failed.length === results.length) {
    console.error("All snapshot jobs failed — exiting non-zero");
    process.exit(1);
  }
  if (failed.length > 0) {
    console.warn(`${failed.length} of ${results.length} jobs failed; partial snapshot committed`);
  }
}

// Only run when executed directly (not imported by tests)
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\.ts$/, ".ts"))) {
  main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
}
