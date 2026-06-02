# Jolpica Rate-Limit Refactor — Junior-Engineer Handoff (6 Phases)

> **Read this first, then work strictly top-to-bottom.** Every phase has exact
> file paths, function signatures, step-by-step instructions, pure-logic
> snippets, tests to write, risks to watch, and a Definition of Done you can
> verify yourself. **Do not start a phase until the previous phase's DoD is
> green.**

---

## 0. Orientation

### 0.1 What you are building and why

Jolpica (the Ergast successor we use for ~80% of stats) enforces a hard
**4 requests / second burst** and **500 requests / hour sustained** limit per
IP for anonymous use, with throttling surfaced as `HTTP 429 "Request was
throttled"`. Source:
[`jolpica/jolpica-f1/docs/rate_limits.md`](https://github.com/jolpica/jolpica-f1/blob/main/docs/rate_limits.md).

Today's dashboard already has good in-process protections (concurrency limiter,
retry with backoff, 5-tier adaptive TTLs). But every cold lambda start, every
new edge region, and every Vercel deploy re-warms `unstable_cache` from
scratch — meaning the next visitor pays the API call. Under traffic spikes this
causes the 429s we've been patching around
(`fix(standings): degrade gracefully on Jolpica timeout instead of 500`).

The fix is **persistent server-side snapshots**: nightly the data is fetched,
the JSON is committed to the repo at `data/snapshots/`, and every route reads
local files before ever touching Jolpica. Snapshots survive deploys, are
available on cold start with zero network IO, and are auditable in PRs.

| Tier | Where it lives | Refresh | Survives deploys? |
|---|---|---|---|
| **Hot** (existing) | Vercel Data Cache (`unstable_cache`) | per-request TTL | No |
| **Cold** (NEW) | `data/snapshots/*.json` in the repo | daily / weekly cron | Yes |
| **Live** (existing fallback) | Jolpica direct call | on cold-tier miss | n/a |

### 0.2 Refresh cadence

| Snapshot file | Cadence | Cron (UTC) | Writer |
|---|---|---|---|
| `data/snapshots/standings-{season}.json` | Daily | `0 5 * * *` | `tools/snapshot-daily.ts` |
| `data/snapshots/schedule-{season}.json` | Daily | `5 5 * * *` | `tools/snapshot-daily.ts` |
| `data/snapshots/season-results-{season}.json` | Daily | `10 5 * * *` | `tools/snapshot-daily.ts` |
| `data/snapshots/driver-career-{id}.json` | Weekly Mon | `30 5 * * 1` | `tools/snapshot-weekly.ts` |
| `data/snapshots/circuit-records-{id}.json` | Weekly Mon | `40 5 * * 1` | `tools/snapshot-weekly.ts` |
| `data/snapshots/driver-seasons-{id}.json` | Weekly Mon | `50 5 * * 1` | `tools/snapshot-weekly.ts` |

`05:00 UTC` = `00:00 ET` (matches existing `weeklyCache.ts` Monday rollover).
West-coast races are over hours earlier; pre-race anticipation builds before
the morning.

### 0.3 Branch & setup

```bash
git fetch origin
git checkout -b feature/jolpica-snapshots origin/main
npm install
npm test          # confirm green baseline before touching anything
```

Never push a red test suite. Commit per phase (or per logical step).

### 0.4 Phase order — DO NOT REORDER

```
Phase 1 (read helper, foundation)
   │
   ├──▶ Phase 2 (daily writer)
   │       │
   │       └──▶ Phase 3 (weekly writer)
   │
   ├──▶ Phase 4 (route migration; depends on Phase 1)
   │
   ├──▶ Phase 5 (CDN headers; can run parallel to Phase 4)
   │
   └──▶ Phase 6 (observability + playbook; last)
```

### 0.5 Non-negotiable conventions

1. **TDD.** Tests first. `npm test` must exit 0 before every commit. Coverage
   gate (`vitest.config.ts`) requires ≥80% lines/fns/stmts and ≥75% branches
   on `src/lib/**/*.ts`.
2. **Reuse, don't rebuild.** The existing primitives in §0.6 already solve the
   in-process problems — your job is to add the cold tier *on top of* them.
3. **Free-tier only.** No Vercel KV, no Postgres, no Blob, no paid SDK
   (`AGENTS.md` forbids paid services). Snapshots live in Git.
4. **Snapshot writer scripts use the existing Jolpica fetcher** — they inherit
   the limiter, retry, and timeout for free. Never bypass `createApiFetcher`.

### 0.6 Reference patterns to copy

| Need | Reuse this |
|---|---|
| Per-service concurrency cap | `src/lib/api/concurrencyLimiter.ts` (`createConcurrencyLimiter`) |
| Retry-with-backoff (handles 429) | `src/lib/api/retry.ts` (`withRetry`, `isRetryable`) |
| Jolpica fetcher (limiter + retry baked in) | `src/lib/api/jolpica.ts` (`getDriverStandings`, etc.) |
| TTL constants | `src/lib/cacheStrategy.ts` (`REVALIDATE_*`, `adaptiveRevalidate`) |
| ET week bucket key | `src/lib/time/weeklyCache.ts` (`currentEtWeekBucket`) |
| `unstable_cache` + `revalidateTag` warmer | `src/lib/projections/snapshot.ts` |
| Cron auth (Bearer CRON_SECRET) | `src/app/api/projections/snapshot/route.ts` |
| Closed-set short-circuit (no API call) | `src/lib/constants/knownChampionships.ts` |
| Route error helpers | `src/lib/api/routeHelpers.ts` (`badRequest`, `serverError`, `gracefulDegradation`) |
| Existing GitHub Action format | `.github/workflows/test.yml`, `smoke-production.yml` |

### 0.7 Out of scope (do not touch in this work)

- `src/lib/api/createApiFetcher.ts`, `retry.ts`, `concurrencyLimiter.ts` —
  already solid; modifying them is a separate task.
- `/api/telemetry`, `/api/race-incidents`, `/api/sessions/*` — OpenF1-backed,
  not Jolpica; they have a different rate-limit regime and live-session
  freshness requirements.
- The existing `vercel.json` projection cron — leave it alone. The new
  GitHub Action runs alongside it.

---

## Phase 1 — Snapshot read helper (foundation)

**Goal:** create the read-side primitive that every migrated route will use —
a function that reads `data/snapshots/<key>.json` if present, falls back to
the live Jolpica call, and gracefully serves stale snapshot data on 429.

### New files

- `src/lib/snapshots/readSnapshot.ts`
- `src/lib/snapshots/readSnapshotOrFetch.ts`
- `src/lib/snapshots/__tests__/readSnapshot.test.ts`
- `src/lib/snapshots/__tests__/readSnapshotOrFetch.test.ts`
- `data/snapshots/.gitkeep` (empty, so the directory exists from day one)

### Modified files

- `tsconfig.json` — confirm `"resolveJsonModule": true` and `"esModuleInterop": true` (they should already be set; if not, set them).
- `.gitignore` — explicitly add a `!data/snapshots/` line so the directory
  isn't accidentally ignored by a future `data/` ignore rule.

### Step-by-step

**1. `src/lib/snapshots/readSnapshot.ts`** — pure I/O, defensive.

```ts
import { readFile } from "node:fs/promises";
import path from "node:path";

const SNAPSHOT_DIR = path.join(process.cwd(), "data", "snapshots");

/**
 * Read a snapshot file. Returns null if the file is absent or the JSON is
 * malformed. Never throws — callers fall through to the live fetcher.
 */
export async function readSnapshot<T>(key: string): Promise<T | null> {
  const safeKey = key.replace(/[^a-z0-9_-]/gi, "");
  if (safeKey !== key || key.length === 0) return null;
  const file = path.join(SNAPSHOT_DIR, `${safeKey}.json`);
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const SNAPSHOT_DIR_PATH = SNAPSHOT_DIR; // exported for tests + writers
```

**2. `src/lib/snapshots/readSnapshotOrFetch.ts`** — the waterfall.

```ts
import { unstable_cache } from "next/cache";
import { readSnapshot } from "./readSnapshot";
import { adaptiveRevalidate, cacheKeySuffix, type DataClass } from "@/lib/cacheStrategy";

export interface ReadSnapshotOrFetchOptions<T> {
  /** Snapshot file basename (no .json suffix), e.g. "standings-current". */
  key: string;
  /** Live fetch function; called only on snapshot miss. */
  liveFn: () => Promise<T>;
  /** DataClass that controls the hot-tier TTL. */
  dataClass: DataClass;
}

/**
 * Hot tier (unstable_cache) wraps cold tier (file) wraps live tier (network).
 * On live-fn 429/timeout, returns the snapshot if available — never throws
 * unless BOTH cold and live tiers fail.
 *
 * Logs "[snapshot-miss]" when the cold tier was empty and the live tier was
 * used (used by Phase 6 observability).
 */
export function readSnapshotOrFetch<T>(opts: ReadSnapshotOrFetchOptions<T>): Promise<T> {
  const { key, liveFn, dataClass } = opts;

  const cached = unstable_cache(
    async () => {
      const snapshot = await readSnapshot<T>(key);
      if (snapshot !== null) return snapshot;

      console.log(`[snapshot-miss] ${key} — falling through to live fetch`);
      try {
        return await liveFn();
      } catch (err) {
        // Last-resort retry of the snapshot in case it appeared between
        // the initial read and the live failure (e.g. mid-deploy).
        const second = await readSnapshot<T>(key);
        if (second !== null) {
          console.warn(`[snapshot-fallback] ${key} — live failed, served stale snapshot`);
          return second;
        }
        throw err;
      }
    },
    ["snapshot", key, cacheKeySuffix(dataClass)],
    { revalidate: adaptiveRevalidate(dataClass) },
  );

  return cached();
}
```

**3. `data/snapshots/.gitkeep`** — empty file.

### Pure logic to extract into `src/lib`

Already extracted (this *is* the new lib code). No JSX, no I/O in routes yet.

### Tests

**`readSnapshot.test.ts` (node project):**
- snapshot present and valid → returns parsed object
- snapshot file missing → returns `null`
- snapshot file present but malformed JSON → returns `null` (does not throw)
- key with `../` or other unsafe characters → returns `null` (path-traversal guard)
- empty-string key → returns `null`

Use `vi.mock("node:fs/promises", …)` to fake `readFile` per test.

**`readSnapshotOrFetch.test.ts` (node project):**
- snapshot present → live fn not called, snapshot returned
- snapshot absent, live fn succeeds → live result returned, `[snapshot-miss]`
  logged
- snapshot absent, live fn throws → second snapshot read attempted; if it
  appeared meanwhile, return it; otherwise rethrow
- snapshot present and live fn would throw → live fn never called (snapshot
  wins, no error surfaces)

Mock `readSnapshot` and `unstable_cache` (the latter passes through in tests —
take the pattern from existing `unstable_cache` tests in
`src/lib/__tests__/`).

### Risks

- **Path traversal.** The `safeKey` regex must reject `..`, `/`, `\`. Test it.
- **`unstable_cache` in tests.** Next's `unstable_cache` doesn't behave like a
  no-op in jsdom; mock it to invoke the inner function directly.
- **JSON.parse on partially-written file.** If a future writer overwrites
  atomically (Phase 2 does this with a temp file + rename), this is fine; if
  not, malformed JSON will be caught by the try/catch.

### Definition of Done

- `npm test` green; coverage for `src/lib/snapshots/**` ≥ 80%/75%.
- `git status` shows the new files and `data/snapshots/.gitkeep` only.
- No production code uses the helper yet (that's Phase 4). Commit.

---

## Phase 2 — Daily snapshot writer (GitHub Action)

**Goal:** every day at 00:00 ET (05:00 UTC), fetch fresh standings, schedule,
and full-season results for the current season and commit the JSON to `main`.

### New files

- `tools/snapshot-daily.ts`
- `.github/workflows/snapshot-daily.yml`
- `tools/__tests__/snapshot-daily.test.ts`

### Modified files

- `package.json` — add scripts:
  ```json
  "snapshot:daily": "tsx tools/snapshot-daily.ts",
  "snapshot:weekly": "tsx tools/snapshot-weekly.ts"
  ```
- `package.json` `devDependencies` — confirm `tsx` is present (it's used by
  the existing `tools/smoke-api.mjs`-style scripts; if not, install it).

### Step-by-step

**1. `tools/snapshot-daily.ts`** — orchestrator script.

```ts
#!/usr/bin/env tsx
import { writeFile, mkdir, rename } from "node:fs/promises";
import path from "node:path";
import {
  getDriverStandings,
  getConstructorStandings,
  getSchedule,
  getSeasonResults,
} from "@/lib/api/jolpica";

const SEASONS = ["current"]; // start with the current season only
const OUT_DIR = path.join(process.cwd(), "data", "snapshots");

interface SnapshotJob<T> {
  key: string;
  fetch: () => Promise<T>;
}

async function atomicWriteJson(file: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  await rename(tmp, file);
}

async function runJob<T>(job: SnapshotJob<T>): Promise<{ key: string; ok: boolean; err?: string }> {
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

async function main(): Promise<void> {
  const jobs: SnapshotJob<unknown>[] = [];

  for (const season of SEASONS) {
    jobs.push({
      key: `standings-${season}`,
      fetch: async () => ({
        drivers: await getDriverStandings(season),
        constructors: await getConstructorStandings(season),
        snapshotAt: new Date().toISOString(),
        source: "jolpica",
      }),
    });
    jobs.push({
      key: `schedule-${season}`,
      fetch: async () => ({
        races: await getSchedule(season),
        snapshotAt: new Date().toISOString(),
        source: "jolpica",
      }),
    });
    jobs.push({
      key: `season-results-${season}`,
      fetch: async () => ({
        races: await getSeasonResults(season),
        snapshotAt: new Date().toISOString(),
        source: "jolpica",
      }),
    });
  }

  // Run jobs serially — the per-call concurrency limiter (default 2) is
  // already enforced inside createApiFetcher. Running jobs serially keeps
  // the writer's behavior obvious and well under Jolpica's 4 rps burst.
  const results = await Promise.all(jobs.map(runJob));

  const failed = results.filter((r) => !r.ok);
  if (failed.length === results.length) {
    console.error("All snapshot jobs failed — exiting non-zero");
    process.exit(1);
  }
  if (failed.length > 0) {
    console.warn(`${failed.length} of ${results.length} jobs failed; partial snapshot committed`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
```

**Note:** the script *intentionally* exits 0 on partial failure so the
GitHub Action commits whatever succeeded — a stale snapshot is better than
no snapshot. It only exits 1 if **every** job failed (likely a wider outage).

**2. `.github/workflows/snapshot-daily.yml`**

```yaml
name: snapshot-daily

on:
  schedule:
    - cron: "0 5 * * *"   # 00:00 ET / 05:00 UTC
  workflow_dispatch: {}    # allow manual runs from the GitHub UI

permissions:
  contents: write           # required to commit the snapshot

jobs:
  refresh:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
      - run: npm ci
      - run: npm run snapshot:daily
      - name: commit snapshot if changed
        run: |
          git config user.name  "snapshot-bot"
          git config user.email "snapshot-bot@users.noreply.github.com"
          git add data/snapshots/
          if git diff --cached --quiet; then
            echo "No snapshot changes."
            exit 0
          fi
          git commit -m "chore(snapshots): daily refresh ($(date -u +%Y-%m-%d))"
          git push origin HEAD:main
```

**3. `tools/__tests__/snapshot-daily.test.ts`** — see Tests section below.

### Pure logic to extract into `src/lib`

`atomicWriteJson` is general-purpose — move it to
`src/lib/snapshots/atomicWriteJson.ts` and unit-test it there. The writer
imports from `src/lib`.

### Tests

**`atomicWriteJson.test.ts` (node project):**
- writes file to disk; final file matches the JSON
- writes to a `.tmp` first, then renames (mock `writeFile` and `rename`,
  assert call order)
- creates the parent directory if missing

**`tools/__tests__/snapshot-daily.test.ts`:**
- mocks the Jolpica fetchers; asserts that on success each job writes the
  expected key
- one job throws → the remaining jobs still write, exit code stays 0
- all jobs throw → exit code is 1

### Risks

- **`git push` permissions.** The workflow needs `permissions: contents: write`
  (set above). If your default branch is protected, exclude `snapshot-bot`
  from the protection or add a deploy key.
- **CI quota.** A 30-second daily run consumes negligible GitHub Actions minutes
  on the free tier.
- **Bad data committed.** If Jolpica returns garbage, the snapshot will be
  garbage. Mitigation: keep a "min-size" sanity check in `runJob` —
  e.g. `if (data.races.length === 0) throw new Error("empty races")`.

### Definition of Done

- Manually trigger the workflow (`gh workflow run snapshot-daily.yml` or the
  GitHub UI "Run workflow" button). Confirm a commit appears on `main` named
  `chore(snapshots): daily refresh (YYYY-MM-DD)` and the three files exist.
- The committed JSON contains `snapshotAt`, `source: "jolpica"`, and non-empty
  arrays.
- `npm test` green. Commit.

---

## Phase 3 — Weekly snapshot writer (career + circuit data)

**Goal:** every Monday at 00:30 ET (05:30 UTC), fan out per-driver career
stats and per-circuit records for the full grid + calendar.

### New files

- `tools/snapshot-weekly.ts`
- `.github/workflows/snapshot-weekly.yml`
- `tools/__tests__/snapshot-weekly.test.ts`

### Modified files

None beyond the `package.json` script added in Phase 2.

### Step-by-step

**1. `tools/snapshot-weekly.ts`** — fan-out orchestrator.

Reuse the existing daily snapshot to get the driver list and circuit list
without an extra API call:

```ts
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
  try { return await fn(); }
  finally { limiter.release(); }
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
    wins, p2, p3, starts, fastestLaps, championships,
    seasons,
    snapshotAt: new Date().toISOString(),
    source: "jolpica",
  });

  await atomicWriteJson(path.join(OUT_DIR, `driver-seasons-${driverId}.json`), {
    driverId, seasons,
    snapshotAt: new Date().toISOString(),
    source: "jolpica",
  });
}

async function snapshotCircuitRecords(circuitId: string): Promise<void> {
  const races = await withLimit(() => getAllRaceResultsAtCircuit(circuitId));
  const records = computeCircuitRecords(races);
  await atomicWriteJson(path.join(OUT_DIR, `circuit-records-${circuitId}.json`), {
    circuitId, records,
    raceCount: races.length,
    snapshotAt: new Date().toISOString(),
    source: "jolpica",
  });
}

async function main(): Promise<void> {
  // Read the daily snapshots written by snapshot-daily.ts to discover drivers
  // and circuits. This avoids two extra Jolpica calls for data we already have.
  const standingsRaw = await readFile(path.join(OUT_DIR, "standings-current.json"), "utf8");
  const scheduleRaw = await readFile(path.join(OUT_DIR, "schedule-current.json"), "utf8");
  const standings = JSON.parse(standingsRaw) as { drivers: { Driver: { driverId: string } }[] };
  const schedule = JSON.parse(scheduleRaw) as { races: { Circuit: { circuitId: string } }[] };

  const driverIds = standings.drivers.map((d) => d.Driver.driverId);
  const circuitIds = [...new Set(schedule.races.map((r) => r.Circuit.circuitId))];

  const driverErrors: string[] = [];
  const circuitErrors: string[] = [];

  for (const driverId of driverIds) {
    try { await snapshotDriverCareer(driverId); console.log(`✔ driver ${driverId}`); }
    catch (err) {
      console.error(`✘ driver ${driverId}:`, err instanceof Error ? err.message : err);
      driverErrors.push(driverId);
    }
  }

  for (const circuitId of circuitIds) {
    try { await snapshotCircuitRecords(circuitId); console.log(`✔ circuit ${circuitId}`); }
    catch (err) {
      console.error(`✘ circuit ${circuitId}:`, err instanceof Error ? err.message : err);
      circuitErrors.push(circuitId);
    }
  }

  console.log(`Summary: ${driverIds.length - driverErrors.length}/${driverIds.length} drivers, ${circuitIds.length - circuitErrors.length}/${circuitIds.length} circuits`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
```

**2. `.github/workflows/snapshot-weekly.yml`**

```yaml
name: snapshot-weekly

on:
  schedule:
    - cron: "30 5 * * 1"   # Monday 00:30 ET / 05:30 UTC
  workflow_dispatch: {}

permissions:
  contents: write

jobs:
  refresh:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
      - run: npm ci
      - run: npm run snapshot:weekly
      - name: commit snapshot if changed
        run: |
          git config user.name  "snapshot-bot"
          git config user.email "snapshot-bot@users.noreply.github.com"
          git add data/snapshots/
          if git diff --cached --quiet; then
            echo "No snapshot changes."
            exit 0
          fi
          git commit -m "chore(snapshots): weekly refresh ($(date -u +%Y-%m-%d))"
          git push origin HEAD:main
```

### Tests

**`tools/__tests__/snapshot-weekly.test.ts`:**
- mocks Jolpica fetchers; given 3 drivers and 2 circuits, asserts 5 + 2 files
  are written
- a single failing driver does not stop the others
- a missing `standings-current.json` causes a clear error (so the weekly job
  is correctly chained to the daily one)

### Risks

- **Budget math.** ~25 drivers × 7 calls + ~24 circuits × ~5 paginated calls
  ≈ 295 calls. At 2 rps that's ~2.5 minutes — well below the 500/hour cap.
  *Do not* raise the concurrency above 2; the retry path can add another
  outstanding call.
- **`getAllRaceResultsAtCircuit` is paginated.** A circuit with 30+ years of
  data is multiple pages. The existing function already paginates internally.
- **Career championship fan-out.** `getDriverCareerChampionships` already
  short-circuits via `knownChampionships.ts` for non-champions, and uses an
  internal worker pool (concurrency 4) for known champs. That's fine — the
  outer limiter (`createApiFetcher` cap of 2) will queue beyond that anyway.
- **Weekly depends on daily.** The weekly run reads `standings-current.json`
  from the previous daily run. If `data/snapshots/` is empty (first run ever)
  add a `workflow_run` trigger that fires snapshot-weekly after the first
  successful snapshot-daily — or just manually trigger snapshot-daily once
  before the first weekly cron fires.

### Definition of Done

- Manually trigger the workflow. Confirm ~25 `driver-career-*.json` and ~24
  `circuit-records-*.json` files appear on `main`.
- Spot-check Hamilton: `data/snapshots/driver-career-hamilton.json` shows
  `wins`, `championships`, `seasons` populated.
- `npm test` green. Commit.

---

## Phase 4 — Route migration

**Goal:** every Jolpica-backed route reads from the snapshot first, so a cold
visitor never blocks on Jolpica.

### Modified files

One at a time:
- `src/app/api/standings/route.ts`
- `src/app/api/schedule/route.ts`
- `src/app/api/results/route.ts`
- `src/app/api/driver-career/route.ts`
- `src/app/api/driver-season/route.ts`
- `src/app/api/circuit-records/route.ts`
- `src/app/api/compare/route.ts` (the `teams` branch only — the `circuit`
  branch needs its own snapshot strategy, see "Future work" at the bottom)

### New files

- Per-route tests already exist in `src/app/api/__tests__/`. Extend them, do
  not create new test files.

### Step-by-step (example: `/api/standings`)

The route today (verbatim, do not delete; this shows the migration):

```ts
const [drivers, constructors] = await Promise.all([
  getDriverStandings(season),
  getConstructorStandings(season),
]);
return NextResponse.json({ drivers, constructors });
```

After migration:

```ts
import { readSnapshotOrFetch } from "@/lib/snapshots/readSnapshotOrFetch";

const payload = await readSnapshotOrFetch({
  key: `standings-${season}`,
  dataClass: "liveStandings",
  liveFn: async () => ({
    drivers: await getDriverStandings(season),
    constructors: await getConstructorStandings(season),
    snapshotAt: new Date().toISOString(),
    source: "live",
  }),
});
return NextResponse.json(payload);
```

The response shape **must match** what the snapshot writer in Phase 2 produces
(otherwise the consumer breaks on snapshot reads). Snapshot writers are the
authoritative shape definition; routes mirror them.

Repeat for each route in the list. For routes whose snapshot is per-id
(e.g. `driver-career-{id}`), build the key from the validated query param:

```ts
const payload = await readSnapshotOrFetch({
  key: `driver-career-${driverId}`,
  dataClass: "careerStats",
  liveFn: () => buildDriverCareerLive(driverId),
});
```

### Tests

For each migrated route, in `src/app/api/__tests__/<route>.test.ts`:
- snapshot present → response matches snapshot shape; Jolpica fetcher NOT
  called (`vi.spyOn`)
- snapshot absent → live fetcher called, returns live result
- snapshot absent and Jolpica throws 429 → snapshot re-read; if still absent,
  the route's existing `gracefulDegradation`/`serverError` handler activates

### Risks

- **Shape drift.** If you change a route's response shape, also update the
  snapshot writer in Phase 2 and re-run it. The existing client code (React
  Query consumers in `src/components/**`) must keep working unchanged.
- **`season=current` vs `season=2025`.** Snapshots are keyed by the literal
  season string ("current" or "2025"). The daily writer only writes
  "current". Historical seasons fall through to live Jolpica — accept this
  for now; revisit in a future task if traffic warrants.
- **`driverId` validation.** `readSnapshot` already path-traversal-guards the
  key, but the route should also reject unknown driver ids early via
  `VALID_ID` to keep the cold tier clean.

### Definition of Done

- For every migrated route, the corresponding snapshot file exists in
  `data/snapshots/` (run Phase 2/3 writers manually if needed).
- `npm test` green.
- Manual smoke: `curl http://localhost:3000/api/standings | jq .source` returns
  `"jolpica"` (the snapshot's source field) when the snapshot exists, `"live"`
  otherwise.
- Commit each route migration as a small, separately-revertable commit.

---

## Phase 5 — CDN edge caching

**Goal:** repeated visitors get a response from Vercel's CDN edge without
invoking a lambda at all.

### New files

- `src/lib/api/edgeHeaders.ts`
- `src/lib/api/__tests__/edgeHeaders.test.ts`

### Modified files

- `src/lib/api/routeHelpers.ts` — extend (additive only, don't break the
  existing signature).
- Every Jolpica-backed route migrated in Phase 4.

### Step-by-step

**1. `src/lib/api/edgeHeaders.ts`**

```ts
import { adaptiveRevalidate, type DataClass } from "@/lib/cacheStrategy";

/**
 * Build a Cache-Control header value for the Vercel/CDN edge. Repeats
 * the unstable_cache TTL at the edge so identical requests don't even
 * invoke the lambda. SWR window = 7 days so users still get *something*
 * if our origin is down.
 */
export function edgeCacheControl(dataClass: DataClass): string {
  const sMaxAge = adaptiveRevalidate(dataClass);
  const swr = 7 * 24 * 60 * 60; // 7 days
  return `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`;
}
```

**2. `src/lib/api/routeHelpers.ts`** — additive: a new `cachedJson()` helper.

```ts
import type { DataClass } from "@/lib/cacheStrategy";
import { edgeCacheControl } from "./edgeHeaders";

/** Same as NextResponse.json but with Cache-Control set for the edge. */
export function cachedJson<T>(body: T, dataClass: DataClass): NextResponse {
  return NextResponse.json(body, {
    headers: { "Cache-Control": edgeCacheControl(dataClass) },
  });
}
```

Leave the existing `badRequest`, `serverError`, `gracefulDegradation`
helpers alone — `cachedJson` is the new path.

**3. Routes** — change `NextResponse.json(payload)` to `cachedJson(payload, "liveStandings")`
(or the appropriate DataClass). One-line change per route.

### Tests

**`edgeHeaders.test.ts`:**
- Each DataClass returns the right `s-maxage` and a constant 7-day SWR
- Race-weekend day returns the tighter `s-maxage` (use a fixed `Date` arg)

For routes: in each existing route test, assert
`res.headers.get("cache-control")` contains `s-maxage`.

### Risks

- **Caching of error responses.** Only call `cachedJson` on success paths.
  `badRequest`/`serverError`/`gracefulDegradation` already do not set
  `Cache-Control` and must continue not to.
- **Per-user data.** This dashboard has no auth so all responses are public.
  If a future PR adds per-user data, that route must NOT use `cachedJson`.

### Definition of Done

- `curl -I` shows `Cache-Control: public, s-maxage=...` on every migrated
  route.
- `npm test` green.
- Commit.

---

## Phase 6 — Observability + operator playbook

**Goal:** when something goes wrong, you can tell from logs and a 5-minute
runbook.

### New files

- `docs/RUNBOOK_SNAPSHOTS.md` — the operator playbook (see template below)

### Modified files

- `tools/smoke-api.mjs` — add a per-route latency assertion (<500ms with
  warm snapshot).
- (Already done in Phase 1: the `[snapshot-miss]` log line.)

### Step-by-step

**1. `tools/smoke-api.mjs`** — add a `latencyMs` field to each route check and
fail the smoke if it exceeds 500ms when run against a warm production environment.

**2. `docs/RUNBOOK_SNAPSHOTS.md`** — template:

```markdown
# Snapshot system runbook

## How to manually refresh
- Daily snapshots: `gh workflow run snapshot-daily.yml` (or in GitHub UI)
- Weekly snapshots: `gh workflow run snapshot-weekly.yml`
- Force a recompute of one snapshot key: delete `data/snapshots/<key>.json`,
  commit + push to main. The next lambda invocation will fall through to live
  and the next daily run will write a fresh snapshot.

## How to read a snapshot
`cat data/snapshots/standings-current.json | jq .` — they are pretty-printed JSON.

## How to roll back a bad snapshot
`git revert <snapshot-commit-sha>` on main. The previous good snapshot is
restored, lambda picks it up on next invocation.

## Diagnosing 429s
Check Vercel logs for `[snapshot-miss]` lines — those identify exactly which
keys are falling through to live Jolpica. If the same key shows up repeatedly,
either:
- the daily writer is failing (check the `snapshot-daily` GitHub Action run
  history), or
- a route's `key` doesn't match the writer's filename (typo).

## Cron schedule
| When (UTC) | Action | Source |
|---|---|---|
| `0 5 * * *` | Daily refresh | `.github/workflows/snapshot-daily.yml` |
| `30 5 * * 1` | Weekly refresh (Mon) | `.github/workflows/snapshot-weekly.yml` |
| `0 6 * * *` | Vercel projections warm | `vercel.json` |
```

### Tests

None new — `tools/smoke-api.mjs` is a smoke test itself.

### Risks

- **`[snapshot-miss]` log volume.** A miss should be rare. If it floods, the
  cron is failing — investigate immediately. Set up a Vercel log-drain alert
  matching `[snapshot-miss]` if you want a Slack ping.

### Definition of Done

- `tools/smoke-api.mjs` passes against production with all routes under 500ms.
- `docs/RUNBOOK_SNAPSHOTS.md` exists and is linked from `onboarding/06-caching.md`.
- Commit.

---

## Final verification (before opening a PR)

1. `npm run lint` — no new errors.
2. `npm test` — all suites green.
3. `npm run test:ci` — coverage gate (≥80% lines/fns/stmts, ≥75% branches)
   passes. If new `src/lib/snapshots/**` drags coverage down, **add tests**.
4. `npm run build` — succeeds.
5. Both GitHub Actions run successfully on a workflow_dispatch trigger.
6. Manual production smoke: visit each migrated route's URL in the browser;
   confirm response includes a `source` field. Check Vercel logs for the
   absence of `[snapshot-miss]` lines under normal traffic.

## Risks & unknowns — verify during work, do not assume

| # | Risk | What to do |
|---|---|---|
| 1 | **Branch protection on main** blocks the bot commit. | Add `snapshot-bot` as an exception or use a deploy key. |
| 2 | **`unstable_cache` semantics in tests** — Next 16 doesn't make this trivial to mock. | Take the mocking pattern from existing tests in `src/lib/__tests__/`. |
| 3 | **Shape drift between writer and route** silently breaks consumers. | The writer is authoritative; every route migration is a same-PR change to both writer and route. |
| 4 | **First-ever weekly run before first daily run** fails because it reads `standings-current.json`. | Manually trigger the daily workflow once before letting weekly cron fire, OR add `workflow_run` chaining. |
| 5 | **Snapshot file rotation.** Over time `data/snapshots/` will grow as historical seasons are added. | Out of scope for v1; current cap is ~75 files (~3 daily + ~25 per-driver × 2 + ~24 per-circuit). |

## Future work (NOT this PR — track as follow-ups)

- **Per-historical-season snapshots.** Today only "current" is snapshotted. A
  second writer (`snapshot-archive.ts`) can backfill any year on demand.
- **Snapshot for `/api/compare?view=circuit`.** This route fans out per-year
  Jolpica calls and is currently the heaviest cold visitor. Needs its own
  shape (per-driver-pair-per-circuit) or a "fetch all-historical for the
  driver lazily and cache" approach.
- **OpenF1 snapshots.** Telemetry/race-control could get their own snapshot
  system, but the freshness requirements are stricter — a different design.
- **Edge-Cache-Control on non-snapshotted routes.** OpenF1 routes could
  benefit from a shorter `s-maxage` too.
- **`Last-Modified` / `ETag` headers** so browsers can do conditional GETs.

---

## TL;DR commit summary (what a reviewer should expect to see)

1. `feat(snapshots): add cold-tier read helper` — Phase 1
2. `feat(snapshots): daily writer + GitHub Action` — Phase 2
3. `feat(snapshots): weekly writer + GitHub Action` — Phase 3
4. `refactor(api): migrate <route> to snapshot read` — Phase 4 (one per route)
5. `feat(api): edge Cache-Control headers` — Phase 5
6. `docs: snapshot system runbook` — Phase 6
