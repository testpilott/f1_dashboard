# 02 — Project Structure

A tour of `src/` so you know where things live before you start grepping.

```
src/
  app/             Next.js App Router (pages + API routes)
  components/      React components (server + client)
  lib/             Shared business logic (fetchers, caching, stats, types)
  hooks/           Cross-cutting React hooks
  test/            Test helpers (e.g. makeApiRequest, mockJolpica)
```

Repo-level companions:

```
data/snapshots/    Committed JSON snapshots — cold-tier read cache, see 05/06
tools/             snapshot-daily.ts, snapshot-weekly.ts, smoke-api.mjs
.github/workflows/ test.yml, smoke-production.yml, snapshot-daily.yml,
                   snapshot-weekly.yml, dependabot maintenance
```

## `src/app/` — pages and API routes

Each folder is a route segment.

```
src/app/
  layout.tsx          Root shell: fonts, Providers, Navbar, skip-to-content
  error.tsx           Route-level error boundary (resets React Query)
  global-error.tsx    Root-layout crash fallback (last-resort error UI)
  not-found.tsx       404 page with recovery links
  loading.tsx         Streaming skeleton fallback
  page.tsx            Home (driver + constructor standings)
  globals.css         Design tokens (CSS variables)
  manifest.ts         PWA-lite web app manifest
  sitemap.ts          XML sitemap (per-race URLs incl.)
  robots.ts           robots.txt
  opengraph-image.tsx Default OG image (per-route overrides allowed)
  api/                API routes — see 07-api-routes.md
  standings/          Championship table
  schedule/           Race calendar
  race/[year]/[round]/   Race detail (incl. opengraph-image override)
  drivers/            Driver grid + profiles
  weekend/            Parked route (returns notFound by product decision)
  projections/        Monte Carlo championship forecast
  compare/            Head-to-head
  news/               RSS-aggregated feed
```

Walk-through per page is in [08-pages.md](08-pages.md).

## `src/components/` — React components

Organised by feature, not by primitive vs composite.

| Folder | What's in it |
|---|---|
| `layout/` | Navbar, sidebar, mobile nav |
| `ui/` | shadcn primitives (Button, Card, Skeleton, Tooltip, SeasonPicker) |
| `standings/` | StandingsTables, FormChip, MedalPositionBadge |
| `race/` | RaceDetailClient, CircuitMap, TrackSVG, CircuitDetailsPanel, CircuitRecords, RaceStartTimes, TelemetryPanel, TeamRadioPanel, LapChart, LapTimeFallbackChart, TireStrategy, IncidentDialog, MarkerTally, CornerSelector |
| `drivers/` | DriverHeadshot, DriverDetailPanel, FavoriteStar |
| `schedule/` | CalendarGrid, ScheduleClient, CircuitThumb |
| `weekend/` | WeekendClient (orchestrator), SessionResults (table + per-session queries) |
| `compare/` | DriversCompareTab, TeamsCompareTab, CircuitHistory, StatBar, PositionBadge |
| `search/` | Top-of-page search bar + results |
| `stats/` | Stat boxes, charts |
| `next-race/` | Upcoming race card |
| `providers.tsx` | QueryClientProvider, ThemeProvider, TooltipProvider |
| `ErrorBoundary.tsx` | Fallback UI for client crashes |

Server-vs-client conventions are in [10-components-theming.md](10-components-theming.md).

## `src/lib/` — shared business logic

This is the biggest folder and the most important one. Read it once.

```
src/lib/
  api/              HTTP fetchers, one file per upstream
    createApiFetcher.ts        Factory: limiter + retry + timeout
    jolpicaLimits.ts           Named query-limit constants for Jolpica
    fetchWithTimeout.ts        AbortController-based fetch
    retry.ts                   Bounded retry with jitter
    concurrencyLimiter.ts      Per-service semaphore
    routeHelpers.ts            badRequest / serverError / etc.
    clientFetch.ts             Browser fetch JSON helper
    withRateLimit.ts           Per-route IP rate limit
    jolpica.ts                 Ergast clone wrapper
    mrData.ts                  MRData envelope + pagination helpers
    championshipVerification.ts Championship counting helper
    openf1.ts                  Live session wrapper
    openmeteo.ts               Weather forecast wrapper
    wikidata.ts                Driver bio wrapper (30-day cache)
    rss.ts                     News feed aggregator
    multiviewer.ts             Circuit layout + race control
  stats/            Pure-function computations (form, pace, career, h2h, …)
  race/             Pure helpers for the Circuit-map feature (extracted from components)
    trackGeometry.ts            SVG transform, viewBox, marker fill/glyph/aria helpers
    markers.ts                  buildIncidentMarkers, buildHotspotMarkers (O(1) corner join)
    sectors.ts                  buildSectorMap, buildSectorGroups, toggleSectorSelection
    __tests__/                  Node tests for all of the above (23 + 8 + 9 tests)
  projections/      Monte Carlo simulator + snapshot builder
  incidents/        Race-control event parser
  charts/           Nivo theme bound to CSS variables
  constants/        Teams, circuits, scoring, feeds, nationality
                    circuitDetails.ts — curated length/turns/elevation/banking,
                    Wikipedia slug + notable corners per circuit
  types/            TypeScript interfaces (jolpica, openf1, domain, …)
  time/             Race-weekend detection, weekly cache bucket
    format.ts                 Schedule/time formatting helpers
  geometry/         Track coordinate helpers
  hooks/            useIsClient, useNow (SSR-safe state)
  cacheStrategy.ts  5-tier DataClass model + adaptiveRevalidate
  validators.ts     Input regex patterns
  ratelimit.ts      In-memory sliding window
  search.ts         Search algorithm
  ical.ts           RFC-5545 calendar builder
  drivers-static.ts Per-driver static bio data
  favorites.ts      localStorage helpers
  season.ts         "current" → 2026 normalization
  utils.ts          Misc helpers
```

## `src/hooks/`

Cross-cutting data-fetching hooks live here.

| Hook | What it owns |
|---|---|
| `useDriverComparison.ts` | Standings + schedule + circuit compare + season compare queries |
| `useTeamsComparison.ts` | Constructor standings + teams compare queries + color derivation |
| `useWeekendSessions.ts` | Sessions-for-meeting query + SESSION_ORDER sort |
| `useCircuitData.ts` | Circuit layout + corners + incidents queries |
| `useDriverDetails.ts` | Driver bio + career queries |

## `src/lib/__tests__/` and `src/app/api/__tests__/`

Tests live next to the code they exercise.

- Pure libs: `src/lib/<area>/__tests__/<area>.test.ts`
- API routes: `src/app/api/__tests__/<route>.test.ts`
- Components: `src/components/<area>/__tests__/<Component>.test.tsx`

The full testing story is in [11-testing.md](11-testing.md).

## Useful entry points by task

| Task | Start here |
|---|---|
| Adding a new API route | [13-recipes.md](13-recipes.md) + [05-data-fetching.md](05-data-fetching.md) |
| Changing how data is cached | [06-caching.md](06-caching.md) |
| Adding a stat or computation | [09-stats-and-projections.md](09-stats-and-projections.md) |
| Tweaking the UI | [10-components-theming.md](10-components-theming.md) |
| Adding a cron | [12-deployment.md](12-deployment.md) |

Next: [03 — Architecture](03-architecture.md).
