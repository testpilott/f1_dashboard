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
