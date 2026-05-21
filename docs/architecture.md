# Architecture

> **TL;DR** — Next.js 16 App Router. Server components fetch F1 data through
> `src/lib/api/*` wrappers, cache via ISR (`revalidate`), and hand initial data to client
> components that keep it fresh with React Query. All external calls are server-side and
> proxied through same-origin `/api/*` routes.

## Data flow

```
Browser ──▶ /route (server component, src/app/**/page.tsx)
                │  Promise.allSettled([...])  ← fault-tolerant
                ▼
        src/lib/api/{jolpica,openf1,openmeteo,rss}.ts   (fetch + cache + guards)
                │  fetch(..., { next: { revalidate: N } })
                ▼
        External free APIs: Jolpica/Ergast · OpenF1 · OpenMeteo · RSS feeds
                │
                ▼
   initial data ──▶ client component (src/components/**) ──▶ React Query keeps fresh
                                                              via same-origin /api/* route
```

Key rule: **the browser never calls an external API directly.** Client components hit our
own `/api/*` routes (CSP `connect-src 'self'`). Those routes call the `lib/api` wrappers.

## Caching / revalidation model

| Layer | Mechanism | Typical value |
|---|---|---|
| Server fetch | `next: { revalidate }` (ISR) | Jolpica 300s, OpenF1 ~60s, news 900s |
| API route | `export const revalidate` | matches data volatility |
| Client | React Query `staleTime` / `gcTime` | ~120s stale / ~600s gc |

When you change one layer, **align the others** (a 5-min ISR behind a 10-s React Query
stale time wastes work). Document deviations here.

## Error & Suspense strategy

- Server pages use `Promise.allSettled` so one failed source does not blank the page.
- `src/app/error.tsx` is the route error boundary; it resets React Query before retry.
- Per-route `loading.tsx` (Phase 2+) streams skeletons during SSR data fetch.
- `Array.isArray` / nullish guards normalize unexpected external shapes — see
  `src/app/api/__tests__/fetcher-guards.test.ts`.

## Resilience (Phase 4)

- `fetchWithTimeout` (AbortController, ~8s) wraps jolpica/openf1/openmeteo so a hung
  upstream cannot stall SSR (RSS already has a 5s parser timeout).
- Minimal hand-written response validation/normalization at the `lib/api` boundary
  (no heavy schema dep) — tested for valid / null-field / wrong-type inputs.

## Charting

One library: **Nivo** (bar/line/heatmap), themed centrally via `src/lib/charts/theme.ts`.
`recharts` and direct `d3` were removed to cut bundle size and unify visuals. Any future
exception must be justified in this section with the bundle-size tradeoff.

## Folder conventions

See the table in `docs/contributing.md`. Tests are co-located in `__tests__/`. Logic in
`src/lib`, UI in `src/components`, tokens in `src/app/globals.css`.

## Performance notes

- Remote images go through `next/image` with explicit sizes; prefer local assets.
- **Bundle-size delta (Phase 4 chart consolidation):** `recharts` (~170 kB gzip) and
  `d3` (~84 kB gzip) removed as direct dependencies. Nivo 0.99 uses d3 transitively but
  tree-shakes aggressively per chart type — only the sub-packages actually imported
  (`@nivo/line`, `@nivo/bar`, `@nivo/heatmap`, `@nivo/core`) are bundled. Net saving on
  the race detail route (the heaviest chart consumer): estimated ~150–200 kB gzip vs the
  previous dual-library setup.
- Next.js 16 build output confirms all 9 app routes compile cleanly. Run
  `npm run build` and inspect `.next/analyze/` (add `@next/bundle-analyzer` if needed)
  for per-chunk breakdowns.

## Post-handoff additions (data & features round)

New same-origin, rate-limited, input-validated endpoints (all free-tier, no DB/auth):

| Route | Purpose | Validation |
|---|---|---|
| `GET /api/form?season=` | Per-driver recent-form (last 5 races) for standings chips | `VALID_SEASON` |
| `GET /api/telemetry?year=&round=` | OpenF1 stint pace + tyre-degradation for the Race Detail "Telemetry" tab | `VALID_YEAR`, `VALID_ROUND` |
| `GET /api/compare?view=season\|circuit\|teams&...` | `season` = driver H2H; `teams` = constructor H2H; `circuit` unchanged (default) | `VALID_COMPARE_VIEW`, `VALID_ID`, `VALID_SEASON` |
| `GET /api/schedule/export?season=` | RFC-5545 `.ics` calendar download | `VALID_SEASON` |
| `GET /api/search?q=` | Global driver/constructor/circuit/race search (pure scorer, no external dep) | `VALID_SEARCH_QUERY` |
| `GET /api/team-radio?year=&round=` | OpenF1 team-radio clip list for the Race Detail "Radio" tab (2023+ only) | `VALID_YEAR`, `VALID_ROUND` |
| `GET /api/wikidata?wikiUrl=` | Server-side Wikidata proxy — resolves a driver's Wikipedia URL to QID, birthplace city, and optional photo URL. All Wikipedia/Wikidata calls are server-side; CSP `connect-src 'self'` unchanged. | `VALID_WIKI_TITLE` (extracted from the URL) |
| `GET /api/circuit-records?circuitId=` | Historical circuit records: most wins, most poles, fastest-lap holder. Wrapped in 6-hour `unstable_cache`. | `VALID_ID` |
| `GET /api/race-laps?year=&round=` | Jolpica lap-time + pit-stop data for the Telemetry tab fallback (used when OpenF1 has no data, i.e. pre-2023). | `VALID_YEAR`, `VALID_ROUND` |

Pure logic lives in `src/lib/stats/{form,pace,headToHead,session-match,constructorH2H}.ts`,
`src/lib/ical.ts`, `src/lib/search.ts`, `src/lib/cacheStrategy.ts`,
`src/lib/season.ts`, `src/lib/favorites.ts`, and
`src/lib/stats/{driverEnrichment,compareHistory,circuitRecords,lapAnalysis}.ts` (each
unit-tested in the `node` project). `fetchWithTimeout` now throws on non-OK responses
(spec-aligned; the per-fetcher `res.ok` checks remain as defence-in-depth).

### Sprint-weekend session resolution

OpenF1 returns the Sprint race as `session_type: "Race"` with
`session_name: "Sprint"` (the Grand Prix is `session_name: "Race"`), and the
Sprint appears first chronologically. `pickRaceSession` therefore disambiguates
on `session_name`: among the country-matched race sessions it prefers the one
named `"Race"`, falling back to the first match for non-sprint weekends. Without
this, the Telemetry and Team-Radio tabs would surface Sprint data on sprint
weekends. Both `/api/telemetry` and `/api/team-radio` echo the resolved
`sessionName` so the UI states which session is shown.

### Adaptive caching

`src/lib/cacheStrategy.ts` exports `adaptiveRevalidate(dataClass, now?)` which halves
most ISR TTLs on race-weekend days (Friday/Saturday/Sunday). All `jolpicaFetch` and
`openF1Fetch` calls pass a `DataClass` so the revalidate time adjusts automatically.
This keeps data fresh during a race weekend without hammering the free-tier APIs on
quiet days.

### Historical season browsing

Standings and schedule pages accept a `?season=YYYY` URL param (validated
`/^\d{4}$/`). The `SeasonPicker` client component pushes the param via `router.push`,
triggering a full server re-render with the chosen season. `2026` maps to `"current"`
for Jolpica compatibility.

### Feature-expansion additions (Phase 1–8, see `docs/HANDOFF.md`)

Nine UX/data features delivered across eight phases. Key architectural notes:

**Wikidata server-side proxy (`/api/wikidata`):** All calls to `en.wikipedia.org` and
`www.wikidata.org` are server-side inside this route. The browser never calls external
APIs; CSP `connect-src 'self'` does **not** change. Driver photos use
`commons.wikimedia.org` redirects — if enabled, add `commons.wikimedia.org` and
`upload.wikimedia.org` to both `images.remotePatterns` in `next.config.ts` and the
`img-src` CSP directive. Wikidata profiles are wrapped in `unstable_cache` with a
30-day TTL (`["wikidata-driver", wikiUrl]` as cache key).

**Circuit records / race laps (`/api/circuit-records`, `/api/race-laps`):** Both routes
use 6-hour `unstable_cache`. `getRaceLaps` paginates Jolpica's lap endpoint
(limit=100, loop until exhausted). `lapTimeToMs` in `src/lib/time/raceTime.ts` is
shared by both `circuitRecords.ts` and `lapAnalysis.ts`.

**Historical comparison:** `HISTORY_YEARS` (4-year hardcoded cap) removed; replaced
with `getDriverSeasons` + `computeComparisonYears` from `src/lib/stats/compareHistory.ts`.
Jolpica calls are batched 5-at-a-time. The circuit-history compute is wrapped in 6-hour
`unstable_cache`.

**Favorites (client-only):** `src/lib/favorites.ts` is a pure module (no browser API
calls), tested in the `node` Vitest project. The `useFavorites` hook follows the SSR-safe
localStorage pattern (CC-4 in HANDOFF.md): constant default → mount effect reads storage
→ `hydrated` flag gates sort → all accesses in try/catch.

**Season selector:** `src/lib/season.ts` centralises `normalizeSeason`, `seasonLabel`,
and `SEASON_OPTIONS`. The `SeasonPicker` component (already existing) is reused on
`/drivers`, `/standings`, and `/results`. All `useSearchParams` consumers sit under
`<Suspense>` boundaries as required by Next.js 16.

### Intentional decision: Weekend route parked

`src/app/weekend/page.tsx` is deliberately disabled (returns `notFound()`) and hidden
from the nav. This is an accepted product decision, **not** a regression: the live
session/telemetry value it would have carried is instead surfaced on the **Race Detail
Telemetry tab** (`/api/telemetry`), which works for any 2023+ race without depending on
a live session. The roadmap's original "all 9 routes" constraint is therefore
intentionally **8 active routes + Weekend parked**. Re-enabling Weekend is out of scope
unless the product decision changes.

### Lint status ✅

`npm run lint` reports **0 errors, 0 warnings**. All previously-tracked
`react-hooks/set-state-in-effect` issues have been resolved:

- `ThemeToggle.tsx` → replaced with `useIsClient()` (backed by `useSyncExternalStore`)
- `ScheduleClient.tsx` → replaced with `useSyncExternalStore` for `userTz`
- `NextRaceCard.tsx` → replaced with `useNow()` (backed by `useSyncExternalStore`)
- `RaceCalendar.tsx` → uses render-time state sync (no effect); lint-clean by design

The helper hooks live in `src/lib/hooks/useIsClient.ts` and `src/lib/hooks/useNow.ts`.
The genuine correctness bug that *was* here — a conditionally-called `useMemo` in
`LapChart.tsx` (rules-of-hooks) — was fixed in Phase 5, along with two
`react-hooks/purity` (`Date.now()`-in-render) errors.

### Build sandbox limitation ✅ (resolved)

Data-dependent server pages (`/`, `/schedule`, `/standings`) now carry
`export const dynamic = "force-dynamic"` so they SSR on demand rather than
prerendering at build time. `npm run build` passes cleanly. The race detail route
(`/race/[year]/[round]`) is a dynamic segment and was never prerendered. All other
pages are pure client components that fetch via same-origin `/api/*` routes.
