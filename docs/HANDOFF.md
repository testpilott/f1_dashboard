# F1 Dashboard — Caching & Freshness Refactor Handoff

> **Audience:** A junior engineer picking up where this refactor leaves off.
> **Read top-to-bottom.** Every section ends with a "verify yourself" checklist.

## 0. What this refactor accomplished (and why)

The dashboard talks to **four upstream APIs** (Jolpica / Ergast, OpenF1, Open-Meteo, Wikidata). Each has different rate-limit / latency / freshness profiles, and we were treating all of them with the same `revalidate = 3600` style guesses. Two production incidents motivated the rewrite:

1. **Monte Carlo projections timeouts.** `/api/projections` ran 10k simulations on a cold cache, often inside the user's request, blowing past Vercel's function timeout.
2. **Driver-career detail page slowness.** The `/api/driver-career` route fanned out six concurrent Jolpica calls per request with no shared concurrency cap, frequently tripping 429s.

To prevent recurrence, this refactor introduced a **5-tier freshness taxonomy** and reworked every fetcher and route to declare its data class explicitly. The cache layer now knows the difference between "live telemetry" and "career stats that haven't changed in 30 years," and the request fan-out is bounded both per-service (cap 2) and per-route (chunked).

### Quick wins shipped
| Area | Before | After |
|---|---|---|
| Projections cold-cache compute | User request triggered 10k Monte Carlo | Cron-warmed; user request returns `{available:false}` if cold |
| `/api/sessions?endpoint=…` | Single mega-route with internal dispatch | Eight per-endpoint routes, each with its own data-class TTL |
| Race-incidents fan-out | Reran per request | Cached one row per (year, round, country) |
| OpenF1 fetchers | Hardcoded TTLs | Pass-through `DataClass` → `adaptiveRevalidate()` |
| Compare-circuit batch size | 5 in-flight per batch | 3, matching the per-service concurrency cap |

---

## 1. The 5-tier freshness model

Defined in [src/lib/cacheStrategy.ts](../src/lib/cacheStrategy.ts) as `type DataClass`. **Every external fetcher must accept a `DataClass`** and pass it through to `adaptiveRevalidate(dataClass)`. The constant `adaptiveRevalidate()` returns tighter TTLs on race weekends (Fri/Sat/Sun) automatically.

| Tier | DataClass keys | Off-week TTL | Race-weekend TTL | Examples |
|---|---|---|---|---|
| **Live session** | `liveTelemetry`, `liveResults`, `liveIncidents` | 10–60 s | 5–30 s | Laps, stints, race control, intervals |
| **Live meta** | `weather` (track), `liveCarMeta` | 5 min | 1 min | Trackside conditions |
| **Daily** | `standings`, `results`, `teams`, `schedule` | 1 h | 15 m | Driver standings, finished results |
| **Weekly** | `careerStats`, `circuitRecords` | 7 d | 7 d | Lifetime wins, fastest laps |
| **Seasonal** | `seasonSchedule`, `circuitMeta`, `wikidata` | 24 h | 6 h | Calendar, circuit lat/lon |

**Rules** (also enforced in `AGENTS.md`):
1. Do not scatter TTL magic numbers. Add a constant to `cacheStrategy.ts` instead.
2. Route segment exports (`revalidate`, `maxDuration`) must be literal numbers — no `6 * 3600`.
3. Every fetcher wrapped by `createApiFetcher()` must accept or choose an explicit `DataClass`.

### Verify yourself
- [ ] Open `src/lib/cacheStrategy.ts` — every key listed above exists in the `DataClass` union.
- [ ] Run `npx vitest run src/lib/__tests__/cacheStrategy.test.ts` — 21 tests pass.
- [ ] `grep -rn "revalidate: [0-9]" src/lib/api/` returns only references to `adaptiveRevalidate(…)` or named constants from `cacheStrategy.ts`.

---

## 2. API route inventory

The full list lives in [src/app/api/](../src/app/api/). Below are the routes that received structural changes in this refactor.

### 2.1 `/api/projections` — read-only cron-warmed
- **File**: [src/app/api/projections/route.ts](../src/app/api/projections/route.ts)
- **Behavior**: validates `season`, checks `isSnapshotWarmed(season)`. If cold, returns `{available:false, reason:"Snapshot pending"}`. If warm, returns the cached projection.
- **Never** triggers the Monte Carlo pipeline on user request.

### 2.2 `/api/projections/snapshot` — cron warmer
- **File**: [src/app/api/projections/snapshot/route.ts](../src/app/api/projections/snapshot/route.ts)
- **Auth**: `Authorization: Bearer ${CRON_SECRET}` env var. Returns 401 otherwise. Vercel Cron sets this header automatically.
- **Schedule**: every 24h via [vercel.json](../vercel.json) (`0 6 * * *`).
- **Behavior**: `revalidateTag("projections", "max")` → `computeProjections(season)` → warm `WARMED_SEASONS` set so subsequent GETs serve the snapshot.

#### How to add seasons
Edit `vercel.json` and add another cron entry with `?season=2024` etc. The snapshot module supports any year 2000–2030.

### 2.3 `/api/sessions/<endpoint>` — split routes
The legacy `/api/sessions?endpoint=…` mega-route became eight per-endpoint routes plus a 308 redirect shim. Each new route lives at `src/app/api/sessions/<endpoint>/route.ts`:

| Path | DataClass | Allows `session_key=latest` |
|---|---|---|
| `/api/sessions/info` | `seasonSchedule` | n/a (uses `year`/`meeting_key`) |
| `/api/sessions/drivers` | `teams` | yes |
| `/api/sessions/result` | `liveResults` | yes |
| `/api/sessions/laps` | `liveTelemetry` | no |
| `/api/sessions/stints` | `liveTelemetry` | no |
| `/api/sessions/pit` | `liveTelemetry` | no |
| `/api/sessions/weather` | `weather` | no |
| `/api/sessions/race-control` | `liveIncidents` | no |

Shared validation helper: [src/app/api/sessions/_shared.ts](../src/app/api/sessions/_shared.ts) (the leading underscore makes it private to Next.js routing).

#### Migrating callers
Replace `\`/api/sessions?endpoint=laps&session_key=${k}\`` with `\`/api/sessions/laps?session_key=${k}\``. The 308 shim keeps old callers working but emits an extra redirect. Already migrated: `LapChart.tsx`, `TireStrategy.tsx`, `WeekendClient.tsx`.

### 2.4 `/api/race-incidents` — cached compute
- **Route**: [src/app/api/race-incidents/route.ts](../src/app/api/race-incidents/route.ts) — thin wrapper. Validates input, looks up schedule, calls `buildIncidentsForRace(year, round, country)`.
- **Helper**: [src/lib/incidents/buildIncidents.ts](../src/lib/incidents/buildIncidents.ts).
  - `computeIncidentsForRace(year, country)` — pure pipeline.
  - `buildIncidentsForRace(year, round, country)` — wraps `computeIncidentsForRace` in `unstable_cache` keyed by all three args, on the `liveIncidents` adaptive TTL.

### 2.5 `/api/compare` — chunked fan-out
- Compare-circuit history chunks years in batches of **3** (was 5) to align with the per-service concurrency cap of 2 in `createApiFetcher`. Larger batches just queued inside the limiter without speeding anything up.

### Verify yourself
- [ ] `curl localhost:3000/api/sessions?endpoint=laps&session_key=9001` → 308 to `/api/sessions/laps?session_key=9001`.
- [ ] `curl localhost:3000/api/projections?season=2026` on a cold deploy → `{available:false, reason:"Snapshot pending…"}`.
- [ ] After running the cron once, the same GET returns the full projection.
- [ ] `npx vitest run src/app/api/__tests__/sessions.test.ts` — 19 tests pass.
- [ ] `npx vitest run src/app/api/__tests__/projections.test.ts` — 11 tests pass.

---

## 3. Concurrency & retry rails

[src/lib/api/createApiFetcher.ts](../src/lib/api/createApiFetcher.ts) wraps every external HTTP call. Important invariants:

- **Per-service concurrency cap = 2.** Two in-flight requests per service (Jolpica / OpenF1 / Open-Meteo / Wikidata) max. Excess requests queue inside the limiter.
- **Retry with ±50% jitter, 500 ms base backoff, max 3 attempts.** See `withRetry`.
- **Honors `Retry-After` headers** for 429 responses.

**Do not** add a second concurrency layer on top of this. Routes that need bounded fan-out (like compare-circuit) should chunk their year list — never spawn 30 parallel calls trusting the limiter to throttle them.

### Verify yourself
- [ ] `npx vitest run src/lib/api/__tests__/createApiFetcher.test.ts` — concurrency cap tests pass.
- [ ] `grep -rn "createApiFetcher" src/lib/api/` — every API wrapper module uses it.

---

## 4. Testing discipline (mandatory)

The pre-commit hook runs `npm test`. Build is gated on `npm run build`. Both **must** pass before pushing.

### Patterns to know
1. **Mock `next/cache`** in API tests that exercise cached helpers — otherwise `unstable_cache` memoizes results across test cases in the same Vitest worker. Use:
   ```ts
   vi.mock("next/cache", () => ({
     unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
     revalidateTag: vi.fn(),
   }));
   ```
   See [src/app/api/__tests__/projections.test.ts](../src/app/api/__tests__/projections.test.ts) for the canonical pattern.

2. **`makeApiRequest`** in [src/test/api.ts](../src/test/api.ts) builds a `Request` with the right URL/query shape for route handlers.

3. **Reset module state** between tests if your route uses module-scoped Sets/Maps (e.g. `WARMED_SEASONS`). The snapshot module exports `_resetSnapshotState()` for this.

### What to test for every new feature
| Change type | Required tests |
|---|---|
| New API route | 400 (bad input), 200 (happy path), 500 or graceful `{available:false}` (upstream failure), 429 (rate-limited shim) |
| New fetcher | DataClass propagation; one positive + one edge case |
| New regex/validator | Accept valid; reject malformed + injection-shaped strings |

### Verify yourself
- [ ] `npm test` exits 0 with 654+ passing tests.
- [ ] `npm run build` exits 0.

---

## 5. Common pitfalls (lessons from this refactor)

1. **`revalidateTag` signature changed in Next.js 16.** It now requires a second `profile` argument: `revalidateTag("posts", "max")`. The single-arg form compiles only with TS errors suppressed and is deprecated. Always pass `"max"` for stale-while-revalidate semantics.

2. **`unstable_cache` memoizes across tests.** When testing a route or helper that uses it, mock `next/cache` to pass through (see §4). Without this, the first test populates the cache and subsequent tests with different mocks read stale data.

3. **Module-scoped state in serverless is per-instance.** The `WARMED_SEASONS` Set in `snapshot.ts` lives on one lambda instance. If multiple instances are spun up, each needs its own warmup. The cron should be frequent enough (every 24h is fine for projections) that any cold instance answers `{available:false}` for at most a few minutes before the next cron run.

4. **Files prefixed `_` in `app/` are private to Next.js routing.** Use this for shared helpers next to route files (e.g. `src/app/api/sessions/_shared.ts`).

5. **Route segment config exports must be literal numbers.** `export const revalidate = 6 * 3600;` breaks Next.js's static analysis. Use `21600`.

6. **`next/image` is the default.** Do not introduce raw `<img>` tags in product code.

---

## 6. Roadmap — work that wasn't done

These tasks were considered but deferred. Each is self-contained.

### 6.1 Persistent snapshot storage (Redis / KV)
Today's `WARMED_SEASONS` is in-memory per lambda. For multi-instance fleets, swap to Vercel KV / Upstash Redis:
- Replace the `Set` with `kv.sismember/sadd` calls.
- Move `getCachedProjections` from `unstable_cache` to a KV-backed read in `snapshot.ts`.

### 6.2 OpenF1 telemetry pre-aggregation
`/api/telemetry` still streams large raw OpenF1 responses. For finished sessions, precompute lap-by-lap aggregates and cache them weekly (`liveTelemetry` becomes `careerStats`-class once the session is over).

### 6.3 Wikidata enrichment cache (driver bios)
Wikidata responses change rarely; current `seasonal` class (24 h) is too aggressive. Consider a 30-day TTL with manual invalidation.

### 6.4 Cron expansion
Add cron warmers for `/api/standings?season=current` and `/api/schedule?season=current` so even the daily-class routes start warm.

### 6.5 Real-time during sessions
For live sessions, the 10–30 s ISR TTLs are still pull-based. A future enhancement is a small WebSocket relay that pushes OpenF1 deltas; the current code's `liveTelemetry` class is the right tier to hook in.

---

## 7. Glossary

- **DataClass** — string literal in `src/lib/cacheStrategy.ts` that tags a piece of data with a freshness tier. Drives `adaptiveRevalidate()` TTLs.
- **adaptiveRevalidate(dataClass, now?)** — returns the TTL (seconds) for a given DataClass. Tighter on race weekends (Fri/Sat/Sun local time).
- **createApiFetcher(serviceName)** — factory that returns a `fetch`-wrapped helper with timeout, retry, jitter, and a per-service concurrency cap of 2.
- **unstable_cache(fn, key, opts)** — Next.js Data Cache primitive. Memoizes `fn` keyed by `key`, with `opts.revalidate` (TTL) and `opts.tags` (for invalidation).
- **revalidateTag(tag, profile)** — invalidates everything tagged with `tag`. In Next.js 16, the `profile` arg is required (`"max"` for stale-while-revalidate).
- **warmSnapshot(season)** — projection cron entrypoint. Invalidates the tag, recomputes, marks the season warmed.

---

## 8. Definition of Done — the whole refactor

- [x] All 5 DataClass tiers defined and exported from `cacheStrategy.ts`.
- [x] All OpenF1 / Open-Meteo / Jolpica fetchers pass an explicit `DataClass`.
- [x] `/api/projections` never triggers Monte Carlo on user request.
- [x] `/api/projections/snapshot` exists, is `CRON_SECRET`-guarded, and is wired into `vercel.json`.
- [x] `/api/sessions/<endpoint>` split into 8 per-endpoint routes. Legacy shim returns 308.
- [x] `/api/race-incidents` uses cached `buildIncidentsForRace` helper.
- [x] Compare-circuit batch size = 3.
- [x] `npm test` exits 0 with ≥654 tests.
- [x] `npm run build` exits 0 cleanly under Next.js 16.2.6.

If anything above goes red, **do not push**. Fix the failure first.
