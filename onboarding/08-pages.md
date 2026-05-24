# 08 — Pages Walkthrough

Every user-facing page is a folder under [src/app/](../src/app/) with a
`page.tsx` (server component by default) plus, where needed, a co-located
`*Client.tsx` for interactivity.

## Root shell

| File | Role |
|---|---|
| [layout.tsx](../src/app/layout.tsx) | Fonts (Geist), `<Providers>`, Navbar, `<main>` wrapper |
| [globals.css](../src/app/globals.css) | CSS variables (the design tokens) |
| [providers.tsx](../src/components/providers.tsx) | `QueryClientProvider`, theme, tooltip |
| [error.tsx](../src/app/error.tsx) | Route-level fallback; resets React Query on retry |
| [loading.tsx](../src/app/loading.tsx) | Streaming skeleton |

The root layout is a server component. Anything that needs hooks, state, or
browser APIs goes inside a child component marked `"use client"`.

## The pages

### `/` — Home

[src/app/page.tsx](../src/app/page.tsx). Shows the current driver standings,
constructor standings, last result, and the next race card. Fan-out via
`Promise.allSettled()` so a single upstream blip never blanks the page.

### `/standings`

[src/app/standings/page.tsx](../src/app/standings/page.tsx). Full championship
tables. Reads from `/api/standings` and renders
[StandingsTables](../src/components/standings/) with form chips per driver.

### `/schedule`

[src/app/schedule/page.tsx](../src/app/schedule/page.tsx). The race calendar.
Reads `/api/schedule`. The client component
[ScheduleClient](../src/components/schedule/) handles the season picker and
displays `CalendarGrid` items with `CircuitThumb` images.

### `/race/[year]/[round]`

[src/app/race/[year]/[round]/page.tsx](../src/app/race/%5Byear%5D/%5Bround%5D/page.tsx).
Race detail. Server component fetches:

- `/api/results?year&round`
- `/api/race-laps?year&round`
- `/api/race-incidents?year&round`
- `/api/circuit-info?year&round`
- `/api/weather?year&round`

All via `Promise.allSettled()`. The client component renders the circuit map,
lap chart, incident timeline, telemetry panel, and weather summary.

### `/drivers` and `/drivers/[id]`

[src/app/drivers/](../src/app/drivers/). Grid + profile. The grid uses
`/api/standings` for the order and `/api/driver-photos` for portraits. Photos
gracefully fall back to a team-coloured silhouette when OpenF1 is unavailable.

The profile page composes `/api/driver-career`, `/api/driver-season`, and
`/api/wikidata`.

### `/weekend`

[src/app/weekend/page.tsx](../src/app/weekend/page.tsx). The live-session view.
Heavier on client polling — `useQuery` with short `staleTime` and
`refetchInterval`. Calls `/api/sessions`, `/api/telemetry`, `/api/team-radio`,
`/api/race-incidents`.

### `/projections`

[src/app/projections/page.tsx](../src/app/projections/page.tsx). Reads a
precomputed Monte Carlo snapshot from `/api/projections`. If the snapshot is
cold (`available: false`), shows an explanatory message — the cron will warm
it within 24 h. See [09-stats-and-projections.md](09-stats-and-projections.md).

### `/compare`

[src/app/compare/page.tsx](../src/app/compare/page.tsx). Head-to-head between
two drivers in a chosen season. Calls `/api/compare`.

### `/news`

[src/app/news/page.tsx](../src/app/news/page.tsx). RSS aggregator. Reads
`/api/news`.

## Server-component vs client-component recipe

| You need… | Component flavour |
|---|---|
| Read data once at request time | Server component (`async function Page()`) |
| `useState`, `useEffect`, `useQuery`, browser APIs | Client component (`"use client"`) |
| Live polling | Client + React Query with `refetchInterval` |
| Form input | Client |
| Suspense skeleton | Server component renders `<Suspense fallback>`; child can be server or client |

Convention: keep server components above the fold, isolate `"use client"` to the
smallest component that genuinely needs the browser. Otherwise you ship JS for
no reason.

## Suspense and streaming

The root `loading.tsx` streams while server components fetch. Nested pages can
have their own `loading.tsx`. The pattern is:

```tsx
export default async function Page() {
  return (
    <>
      <FastSection />          {/* awaited inline */}
      <Suspense fallback={<Skeleton />}>
        <SlowSection />        {/* its own async boundary */}
      </Suspense>
    </>
  );
}
```

## Adding a new page

1. Create a folder under `src/app/<route>/` with `page.tsx`.
2. If you need an existing API, call it via same-origin `fetch()` server-side.
3. If you need a new endpoint, add it under `src/app/api/` first
   ([07-api-routes.md](07-api-routes.md), [13-recipes.md](13-recipes.md)).
4. Use `Promise.allSettled()` for multi-fetch pages.
5. Add a `loading.tsx` if the slowest fetcher is > 200 ms.
6. Don't import a fetcher (`fetchJolpica`) directly from a page — always go
   through `/api/*`. This keeps client and server on the same contract.

Next: [09 — Stats & Projections](09-stats-and-projections.md).
