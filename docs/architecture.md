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
| `GET /api/compare?view=season\|circuit&...` | `season` adds full-season head-to-head; `circuit` unchanged (default) | `VALID_COMPARE_VIEW`, `VALID_ID`, `VALID_SEASON` |
| `GET /api/schedule/export?season=` | RFC-5545 `.ics` calendar download | `VALID_SEASON` |

Pure logic lives in `src/lib/stats/{form,pace,headToHead,session-match}.ts` and
`src/lib/ical.ts` (each unit-tested in the `node` project). `fetchWithTimeout` now
throws on non-OK responses (spec-aligned; the per-fetcher `res.ok` checks remain as
defence-in-depth).

### Intentional decision: Weekend route parked

`src/app/weekend/page.tsx` is deliberately disabled (returns `notFound()`) and hidden
from the nav. This is an accepted product decision, **not** a regression: the live
session/telemetry value it would have carried is instead surfaced on the **Race Detail
Telemetry tab** (`/api/telemetry`), which works for any 2023+ race without depending on
a live session. The roadmap's original "all 9 routes" constraint is therefore
intentionally **8 active routes + Weekend parked**. Re-enabling Weekend is out of scope
unless the product decision changes.

### Known lint debt (pre-existing, tracked)

`npm run lint` reports 5 remaining `react-hooks/set-state-in-effect` errors, all
pre-existing in handoff code and all the **same intentional SSR hydration mount-guard
pattern** (`useEffect(() => setX(clientOnlyValue), [])`):

- `components/ui/ThemeToggle.tsx:12` (mounted flag for `next-themes`)
- `components/schedule/ScheduleClient.tsx:62, ~167` (`userTz`, expand state)
- `components/next-race/NextRaceCard.tsx:42` (countdown)
- `components/weekend/RaceCalendar.tsx:46` (countdown)

These set client-only state *after* hydration specifically to avoid a server/client
hydration mismatch — converting them to lazy `useState` initialisers would reintroduce
that mismatch. Recommended remediation (separate, browser-verified task): adopt
`useSyncExternalStore` (or a `useIsMounted`/`useClientValue` hook) so the value is read
through a hydration-safe API rather than an effect. Not done here because it cannot be
browser-verified in the build sandbox and the rule is advisory (performance, not
correctness). The genuine correctness bug that *was* here — a conditionally-called
`useMemo` in `LapChart.tsx` (rules-of-hooks) — has been fixed, along with two
`react-hooks/purity` (`Date.now()`-in-render) errors.

### Build sandbox limitation

`npm run build` fails in the isolated build sandbox because statically-prerendered
pages (e.g. `/schedule`) fetch the external Jolpica API at build time and the sandbox
blocks egress (`403`). This reproduces on the untouched merge base, so it is an
**environmental/architectural** constraint, not a code regression. Recommended fix
(separate task): mark data-dependent pages dynamic (`export const dynamic =
"force-dynamic"`) or add a build-time fallback so SSG does not depend on a live API.
