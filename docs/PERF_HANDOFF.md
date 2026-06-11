# Performance Refactor (Mobile + Web) — Junior-Engineer Handoff (6 Phases)

> **Read this first, then work strictly top-to-bottom.** Every phase has exact
> file paths, step-by-step instructions, how to measure the win, risks to
> watch, and a Definition of Done you can verify yourself. **Do not start a
> phase until the previous phase's DoD is green.**

---

## 0. Orientation

### 0.1 What you are doing, and why

Two parallel audits of `main` found seven high-value, low-risk client-delivery
wins not yet adopted. None changes behavior — they shrink what the browser
downloads, parses, and waits for, especially on mobile.

| Finding (verified in code) | Impact |
|---|---|
| `next/dynamic` used **zero times** in `src/`; `@nivo/line` imported statically in `LapChart.tsx` + `LapTimeFallbackChart.tsx` | Chart code (~150 kB gzip) ships in every page's first-load bundle, including pages that never render a chart |
| `DriverHeadshot.tsx:44` and `CircuitThumb.tsx:15` set `unoptimized` on `<Image>` | Defeats Next image optimization: no AVIF/WebP, no responsive `srcset`, mobile downloads full-resolution PNGs |
| `Promise.allSettled` server-prefetch in `src/app/page.tsx` and `standings/page.tsx`, then client `useQuery` re-fetches the same data | Two round-trips per page load; first paint waits twice |
| Of 31 API routes, only 6 use `cachedJson` (sets `Cache-Control: public, s-maxage=…, stale-while-revalidate=604800`). 19 return raw `NextResponse.json` on success | CDN edges can't serve repeats; lambda invoked every visit |
| `Providers` sets `refetchOnWindowFocus: false` but leaves `refetchOnReconnect` at the default `true` | Mobile users on flaky cell hand-offs get a refetch storm every reconnection |
| Every API route runs on Node; no `runtime = "edge"` or `preferredRegion` anywhere | Mobile users far from `iad1`/`fra1` pay extra cold-start latency |
| `globals.css` has zero `prefers-reduced-motion` rules; `layout.tsx` has no explicit `viewport` metadata | Accessibility miss + small mobile-keyboard layout jumps in the search bar |

### 0.2 Stack reminders

Next.js 16 App Router, TypeScript, React 19, React Query v5, Tailwind v4,
Nivo charts. Snapshot caching is **already shipped** (`data/snapshots/*.json`,
`readSnapshotOrFetch`); edge `Cache-Control` helper already exists
(`src/lib/api/edgeHeaders.ts`); 5-tier `DataClass` already exists. This work
**uses** those primitives, doesn't replace them.

### 0.3 Branch & setup

```bash
git fetch origin
git checkout -b perf/mobile-web origin/main
npm install
npm test          # green baseline (689 tests) before touching anything
npm run build     # record first-load JS sizes — Phase 2 will diff against these
```

Save the build output. The "First Load JS" table at the bottom of
`npm run build` is your before/after measurement for Phase 2.

### 0.4 Phase order — DO NOT REORDER

```
P1 (RQ + image flags) ──┐
P2 (dynamic charts) ────┤
P3 (cachedJson sweep) ──┼──▶ all independent; commit each separately
P4 (RQ hydration) ──────┤
P5 (preferredRegion) ◀── P3
P6 (mobile polish) ─────┘
```

P1–P4 + P6 have no inter-dependencies. P5 must come after P3 so the routes
already emit `Cache-Control` before changing the runtime/region.

### 0.5 Non-negotiable conventions

1. **Behavior-preserving for users.** Faster, not different. A pixel-identical
   render and an identical Network panel waterfall (modulo fewer requests) is
   the success criterion.
2. **TDD where the change is testable.** `npm test` is the gate for Phase 1
   and 4. Phase 2 is gated by `npm run build` first-load-JS delta. Phase 3 is
   gated by `curl -I` and `npm test` (existing route tests). Phase 5 is gated
   by `curl -w "%{time_total}"` and `npm run build` success. Phase 6 is gated
   by Lighthouse mobile.
3. **AGENTS.md rules apply** (tokens only, route guardrails, DataClass rules,
   segment-config literals).
4. **Docs-as-you-go.** Each phase's DoD includes updating the onboarding
   chapter that describes what you changed.

### 0.6 How to measure each phase's win

| Phase | Measurement command | Expected delta |
|---|---|---|
| 1 | `npm test` + Lighthouse audit on `/drivers` | LCP image change visible; no test regressions |
| 2 | `npm run build`, diff the "First Load JS" column for `/race/[year]/[round]` | -150 to -200 kB gzip |
| 3 | `curl -sI https://<preview>/api/news \| grep -i cache-control` | `public, s-maxage=…, stale-while-revalidate=604800` present |
| 4 | DevTools Network panel, hard reload `/standings` | Zero `/api/standings` request fired on first paint |
| 5 | `curl -w "%{time_total}\n" -o /dev/null -s https://<preview>/api/standings` ×10 | Median drops ~50–80 ms for users far from origin region |
| 6 | Lighthouse mobile run on preview URL | "Reduce motion" honored when OS toggle on; viewport stable when keyboard opens |

### 0.7 Reference patterns to copy

| Need | Copy from |
|---|---|
| `cachedJson(payload, "<DataClass>")` usage | `src/app/api/standings/route.ts` |
| `edgeCacheControl` helper | `src/lib/api/edgeHeaders.ts` |
| Server-page `Promise.allSettled` prefetch | `src/app/standings/page.tsx`, `src/app/page.tsx` |
| House handoff format (this doc) | `docs/JOLPICA_RATELIMIT_HANDOFF.md`, `docs/REFACTOR_HANDOFF.md` |

---

## Phase 1 — React Query defaults + image flags (LOW risk)

**Goal:** four small, independently-revertable wins that ship in one commit.

### Modified files
- `src/components/providers.tsx`
- `src/components/drivers/DriverHeadshot.tsx`
- `src/components/schedule/CircuitThumb.tsx`
- `src/components/layout/Navbar.tsx` (Image props)
- `src/app/drivers/page.tsx` (audit `refetchOnMount: "always"` usage)
- `src/app/layout.tsx` (Geist Mono `display: "swap"`)
- `onboarding/05-data-fetching.md` (docs-as-you-go: note RQ defaults)

### Step-by-step

1. **`refetchOnReconnect: false`** in `Providers`:
   ```ts
   defaultOptions: {
     queries: {
       staleTime: 2 * 60 * 1000,
       gcTime: 10 * 60 * 1000,
       retry: 2,
       retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
       refetchOnWindowFocus: false,
       refetchOnReconnect: false,   // ← add this line
     },
   },
   ```
   Rationale: nothing in this dashboard requires sub-`staleTime` freshness
   the instant a phone reconnects. Snapshot tier + ISR already keep data
   fresh; the reconnect storm is pure noise on mobile.

2. **Audit `refetchOnMount: "always"`.** `grep -rn 'refetchOnMount: "always"' src/`
   — verified one hit in `src/app/drivers/page.tsx` (driver-photos query).
   It exists because the photo-cache version bumps used to need it. Snapshot
   tier handles that now; **remove the override** (leave the default `true`,
   which already refetches on mount when stale). If a jsdom test depended on
   the override, leave that one in and document why in a comment.

3. **`unoptimized` → out, `sizes`/`priority` → in.**
   - `DriverHeadshot.tsx:44`: delete `unoptimized`. Add `sizes="(max-width:
     640px) 80px, 120px"` (match the rendered CSS sizes). The first 4
     headshots on `/drivers` (above the fold) should receive `priority={true}`
     from the parent — pass through a `priority?: boolean` prop, default
     `false`, and set it on indexes 0–3 in `src/app/drivers/page.tsx`.
   - `CircuitThumb.tsx:15`: delete `unoptimized`. Add
     `sizes="(max-width: 640px) 100vw, 25vw"`. The first thumbnail on `/`
     (next race hero) should get `priority`.
   - `Navbar.tsx`: the F1 logo `<Image>` should already render small and
     above-the-fold — add `priority` so it's not lazy-loaded.
   - Re-check `next.config.ts` `images.remotePatterns` covers every host
     that previously had `unoptimized` slipping past it. Headshot URLs
     come from OpenF1 / Wikidata — verify both hosts are in `remotePatterns`
     before removing `unoptimized` on real driver data. **If a host is
     missing, do NOT remove `unoptimized` from headshots in this phase**
     — file a one-line follow-up to add the pattern, ship the rest.

4. **Geist Mono font-display.** In `src/app/layout.tsx`'s `next/font/google`
   call for Geist Mono, add `display: "swap"` to match Titillium Web and
   Exo 2. One line. Prevents the rare FOIT on slow mobile networks.

### Tests

- `npm test` — green; the React Query default change shouldn't affect tests
  but the photo-query override removal might surface a test that asserted on
  it. If so, update the test to assert the new behavior with a brief comment.
- Add a one-liner to `src/components/__tests__/providers.test.tsx` (create if
  it doesn't exist) that asserts the defaults block contains
  `refetchOnReconnect: false`. Belt-and-braces against accidental reverts.

### Risks
- Removing `unoptimized` on a host that isn't in `remotePatterns` will break
  the image at runtime — **always verify the host first** (step 3).
- The photo-query override removal: if you see double-load on `/drivers` in
  DevTools after the change, the snapshot cache wasn't being honored for that
  key. Revert just that line and file a follow-up.

### Definition of Done
- `npm test` green.
- `grep -n "refetchOnReconnect" src/components/providers.tsx` shows the new
  line.
- `grep -rn "unoptimized" src/components/` → empty (or one hit with a
  follow-up issue link if a host is genuinely missing from `remotePatterns`).
- Manual: open `/drivers` in DevTools mobile emulation, hard reload, confirm
  the first 4 headshots include `fetchpriority="high"` in their `<img>` tags.
- `onboarding/05-data-fetching.md` documents `refetchOnReconnect: false`.
- Commit: `perf: tighten RQ defaults + enable Next image optimization`.

---

## Phase 2 — Dynamic-import the chart bundle (LOW risk)

**Goal:** Nivo charts load only when their tab/section is visible, removing
~150–200 kB gzip from `/race/[year]/[round]`'s first-load JS.

### Modified files
- `src/components/race/LapChart.tsx`
- `src/components/race/LapTimeFallbackChart.tsx`
- Their parent files that import them (find via
  `grep -rln "from \"@/components/race/LapChart\"\\|from \"@/components/race/LapTimeFallbackChart\"" src/`)
- `onboarding/10-components-theming.md` (docs-as-you-go: chart-loading rule)

### Step-by-step

1. **Identify the chart consumers.** Verified Nivo consumers (only two):
   - `src/components/race/LapChart.tsx` — `from "@nivo/line"`
   - `src/components/race/LapTimeFallbackChart.tsx` — `from "@nivo/line"`
   `TireStrategy.tsx` does NOT use Nivo (it draws SVG by hand); leave it.

2. **Two ways to dynamic-import** — pick (a):

   **(a) Wrap the consumer with `next/dynamic` (preferred).** At each parent
   file (where `LapChart` is imported into the race detail UI), replace the
   static import:
   ```tsx
   // before
   import LapChart from "@/components/race/LapChart";

   // after
   import dynamic from "next/dynamic";
   import { Skeleton } from "@/components/ui/skeleton";
   const LapChart = dynamic(() => import("@/components/race/LapChart"), {
     ssr: false,
     loading: () => <Skeleton className="h-[360px] w-full" />,
   });
   ```
   Match the Skeleton's `h-[Npx]` to the chart's rendered height **exactly**
   (read it off `LapChart.tsx` — currently the `ResponsiveLine`'s wrapper
   div). A 1-px mismatch causes Cumulative Layout Shift on mobile.

   **(b) Internal dynamic of `@nivo/line`** — not recommended; `next/dynamic`
   at the consumer boundary gives Next a clean code-split signal.

3. **Repeat for `LapTimeFallbackChart`.**

4. **Diff the bundle.** Run `npm run build` before and after; the "First Load
   JS" column for `/race/[year]/[round]` should drop by 150–200 kB gzip. Paste
   the before/after into the commit message body.

5. **SSR check.** `ssr: false` is correct here — both charts render
   client-side via React Query data and have no SSR contribution. Confirm by
   loading `/race/<recent year>/<recent round>` in DevTools "Disable
   JavaScript" mode — the page should render everything except the chart
   area, which shows the Skeleton.

### Tests

- `npm test` — existing jsdom tests for chart parents (e.g.
  `RaceDetailClient.test.tsx`) mock React Query and assert on DOM. They may
  need the `dynamic` import mocked — the standard pattern is in
  `vi.mock("next/dynamic", () => ({ default: (loader) => { /* synchronous
  resolve in test env */ } }))`. Use the existing mock if one exists; check
  `src/test/` first.
- If no existing helper, add `src/test/mockNextDynamic.ts` exporting a
  factory; import it in tests that render parents.

### Risks
- **Layout shift.** Skeleton dimensions must match the loaded chart exactly,
  otherwise mobile users see a jump. Measure on a real phone if possible.
- **Mocks.** Vitest's jsdom env doesn't auto-resolve `next/dynamic` — without
  a mock, the chart never appears and the parent test fails with a "rendered
  null" assertion mismatch.

### Definition of Done
- `npm test` green.
- `npm run build`: `/race/[year]/[round]` first-load JS dropped by ≥120 kB
  gzip (record exact delta in commit message).
- Manual: race detail page in DevTools shows the chart loaded from a
  *separate chunk* (Network → JS filter → look for a `chunks/*.js` request
  on first chart paint).
- `onboarding/10-components-theming.md` documents the chart-via-`next/dynamic`
  pattern as the standard.
- Commit: `perf(race): dynamic-import Nivo charts (-NkB first-load JS)`.

---

## Phase 3 — CDN edge headers on raw routes (LOW-MED risk)

**Goal:** every cache-eligible route emits `Cache-Control` so CDN edges serve
repeats without invoking the lambda.

### Modified files
The 19 routes returning raw `NextResponse.json` on their success path. Find
the full list with:
```bash
grep -rln "NextResponse.json" src/app/api/*/route.ts src/app/api/*/*/route.ts \
  | xargs grep -L "cachedJson"
```
The audit-verified routes to migrate:
```
src/app/api/circuit-info/route.ts        → circuitMeta
src/app/api/driver-photos/route.ts       → driverProfile (24h+)
src/app/api/form/route.ts                → form
src/app/api/logo/route.ts                → teams (24h)
src/app/api/news/route.ts                → news
src/app/api/projections/route.ts         → projections
src/app/api/race-incidents/route.ts      → liveIncidents
src/app/api/race-laps/route.ts           → results (1h)
src/app/api/results/route.ts             → results
src/app/api/schedule/route.ts            → schedule
src/app/api/schedule/export/route.ts     → schedule  (also: keep the .ics content-type!)
src/app/api/search/route.ts              → seasonSchedule (1h)
src/app/api/sessions/drivers/route.ts    → teams
src/app/api/sessions/info/route.ts       → seasonSchedule
src/app/api/sessions/laps/route.ts       → liveTelemetry
src/app/api/sessions/pit/route.ts        → liveTelemetry
src/app/api/sessions/race-control/route.ts → liveIncidents
src/app/api/sessions/result/route.ts     → liveResults
src/app/api/sessions/stints/route.ts     → liveTelemetry
src/app/api/sessions/weather/route.ts    → weather
src/app/api/team-radio/route.ts          → results
src/app/api/telemetry/route.ts           → liveTelemetry
src/app/api/weather/route.ts             → weather
src/app/api/wikidata/route.ts            → wikidata (legacy) / seasonal
```

(The legacy `/api/sessions/route.ts` is a 308 redirect shim — no body, no
caching change needed.)

### Step-by-step

1. **For each route**, replace the success-path `NextResponse.json(payload)`
   with `cachedJson(payload, "<dataClass>")` from
   `@/lib/api/routeHelpers` — the DataClass column above is the mapping. If
   the route uses a `DataClass` somewhere else in the file (e.g. inside its
   fetcher), reuse that same key for consistency.

2. **Critical: do NOT add headers to error or degraded paths.**
   `gracefulDegradation(...)` and `serverError(...)` must stay uncached
   (the helpers already omit `Cache-Control`; do not touch them). The CDN
   would otherwise cache a 5xx or `{available:false}` and serve it for the
   full SWR window.

3. **`schedule/export` content-type.** That route emits `.ics` calendar
   data, not JSON. Don't blindly call `cachedJson`. Either:
   - Add a sibling `cachedResponse(body, contentType, dataClass)` helper to
     `routeHelpers.ts`, or
   - Inline `headers: { "Cache-Control": edgeCacheControl("schedule"),
     "Content-Type": "text/calendar" }` on the existing `new Response(...)`.
   The second is cleaner and avoids growing the helper for one caller.

4. **Sessions routes via shared helper.** Check
   `src/app/api/sessions/_shared.ts` — if it has a `json(...)` helper used by
   all eight session routes, change that single helper to set
   `Cache-Control`. Otherwise edit each route individually.

5. **Re-run `npm test`.** Existing route tests assert on
   `expect(res.status).toBe(200)` and body shape — they won't notice the new
   header. Add one assertion per migrated route's test:
   ```ts
   expect(res.headers.get("cache-control")).toMatch(/s-maxage=\d+/);
   ```

### Risks
- A misclassified DataClass means a wrong TTL — a few minutes of live data
  could be served for an hour. **Always pick the DataClass that already
  matches what the fetcher inside the route uses.** If unsure, grep for
  `adaptiveRevalidate(` in the route file and use that key.
- Schedule export: the `.ics` content type must be preserved; cached HTML
  in place of a calendar download is a hard-to-diagnose support ticket.
- `/api/projections`: degraded `{available:false}` path must remain
  uncached.

### Definition of Done
- `npm test` green.
- `grep -L cachedJson src/app/api/*/route.ts src/app/api/*/*/route.ts |
  xargs grep -l "NextResponse.json" | wc -l` → 0 or a small documented set
  (logo can 404, projections-snapshot can 401 — those are not 200-OK paths).
- `curl -sI <preview>/api/news | grep -i cache-control` returns a header
  containing `s-maxage`.
- `onboarding/07-api-routes.md` updated: "Every route's 200-OK path uses
  `cachedJson`; error/degraded paths do NOT."
- Commit per logical group: one for sessions/*, one for the data routes,
  one for the schedule export. Three commits total.

---

## Phase 4 — Server-side React Query hydration (MED risk)

**Goal:** the 4 server pages that already `Promise.allSettled`-prefetch data
hand it to React Query via `<HydrationBoundary>`, eliminating the client
re-fetch on first paint.

### Modified files
- `src/app/page.tsx` (home, server)
- `src/app/standings/page.tsx` (server)
- `src/app/schedule/page.tsx` (server)
- `src/app/race/[year]/[round]/page.tsx` (server)
- The client islands they wrap (just import changes — see step 1)
- `onboarding/05-data-fetching.md` (docs-as-you-go: hydration recipe)

The 4 client-rendered pages (`compare`, `drivers`, `news`, `projections`) are
**not** in scope here — they have no server prefetch to hydrate. A separate
follow-up could convert them to the server+hydrate pattern, but that's
behavior-changing and out of scope for this perf pass.

### Step-by-step

1. **For each server page**, modify the server component:
   ```tsx
   // server page
   import { QueryClient, HydrationBoundary, dehydrate } from "@tanstack/react-query";

   export default async function StandingsPage({ searchParams }: …) {
     const season = normalizeSeason(searchParams.season);
     const queryClient = new QueryClient();

     // existing Promise.allSettled prefetch is here — keep it, but now
     // route it through queryClient.prefetchQuery so it lands in the cache:
     await Promise.allSettled([
       queryClient.prefetchQuery({
         queryKey: ["standings", season],            // ← must match the client's useQuery key BYTE-FOR-BYTE
         queryFn: () => getDriverStandings(season),
       }),
       queryClient.prefetchQuery({
         queryKey: ["form", season],
         queryFn: () => getDriverForm(season),
       }),
     ]);

     return (
       <HydrationBoundary state={dehydrate(queryClient)}>
         <StandingsClient season={season} />
       </HydrationBoundary>
     );
   }
   ```
   The client's `useQuery({ queryKey: ["standings", season], queryFn:
   fetchStandings })` reads the dehydrated state synchronously on mount — no
   network request fires.

2. **Verify the queryKey match.** Run
   `grep -rn 'queryKey:' src/components/standings src/app/standings` (and the
   equivalents for the other 3 pages) — copy the **exact** key array used by
   the client into `prefetchQuery`. A single typo (e.g. `["standing"]` vs
   `["standings"]`) means the hydration is silently wasted.

3. **`queryFn` argument.** On the server, `queryFn` can call the lib fetcher
   directly (`getDriverStandings(season)`). On the client, it usually goes
   through `/api/standings`. Both must return the **same shape**. Verify by
   logging the dehydrated state in dev once.

4. **Race detail page.** Its `Promise.allSettled` covers schedule, race
   results, qualifying, sprint — wrap each in `prefetchQuery` with the
   matching client `queryKey`s. The hydration win is biggest here because
   the page has the most queries.

### Tests

- Existing jsdom tests for client islands mock `useQuery` — they're fine.
- Add one server-component test per page (or extend an existing one) that
  asserts the dehydrated state contains the expected keys:
  ```ts
  const html = await renderToString(<StandingsPage ... />);
  expect(html).toContain(`"standings"`); // key appears in serialised state
  ```
  This catches the byte-for-byte queryKey mismatch.

### Risks
- **queryKey drift is silent.** A mismatched key doesn't error — the client
  just refetches anyway, and you've added work for zero benefit. The DoD's
  Network panel check is your only real safety net.
- **Stale snapshot during hydration.** The server fetch goes through the
  same `readSnapshotOrFetch` waterfall the API route uses, so this stays
  consistent. Good.
- **`queryClient` per request.** It is created fresh in each request
  (`new QueryClient()` inside the server component) — do not lift it to
  module scope; that would leak across requests.

### Definition of Done
- `npm test` green; new server-component tests passing.
- DevTools Network panel hard-reload of `/standings`: zero `/api/standings`
  request fired on first paint (the client `useQuery` reads from hydrated
  cache). Same check for `/`, `/schedule`, `/race/<year>/<round>`.
- `onboarding/05-data-fetching.md` documents the hydration recipe as
  the standard pattern for server pages.
- Commit per page (4 commits, easier review/revert): e.g.
  `perf(standings): hydrate RQ cache from server prefetch`.

---

## Phase 5 — `preferredRegion` on snapshot-backed read routes (MED risk)

**Goal:** lower median request latency for users far from the deployment
region. **Depends on Phase 3** (so routes already emit `Cache-Control`
before the runtime change — that ordering reduces the impact of any one
phase being reverted).

### Why `preferredRegion`, not `runtime = "edge"`

`readSnapshotOrFetch` (`src/lib/snapshots/readSnapshotOrFetch.ts`) uses
`fs/promises` to read `data/snapshots/*.json`. **Edge runtime has no
filesystem access** — flipping a snapshot-backed route to `runtime = "edge"`
would break the cold-tier read. You'd have to migrate snapshot reads to
fetch from a static asset URL instead (a 1-day task on its own).

The 90% win without that work: **pin every snapshot-backed Node route to a
single region** so it's geographically close to the bulk of users. The
F1-audience primary regions are typically Europe (`fra1`) or US East
(`iad1`); pick the one closest to the user base (check Vercel Analytics if
available; otherwise default to `iad1` since the Vercel default is `iad1`
already — making this an explicit no-op for clarity and a one-line opt-in
to future region tuning).

### Modified files
- One added export per snapshot-backed route:
  - `src/app/api/standings/route.ts`
  - `src/app/api/schedule/route.ts`
  - `src/app/api/results/route.ts`
  - `src/app/api/driver-career/route.ts`
  - `src/app/api/driver-season/route.ts`
  - `src/app/api/circuit-records/route.ts`
  - `src/app/api/compare/route.ts`
- `onboarding/12-deployment.md` (docs-as-you-go: region rationale)

### Step-by-step

1. Add to each of the 7 routes above:
   ```ts
   export const preferredRegion = "iad1";  // or "fra1" — see deployment docs
   ```
   Place it next to the existing `export const revalidate = …` line. Must be
   a literal string (segment-config rule in AGENTS.md).

2. **Do NOT add `runtime = "edge"` to these routes** — they use `fs` via
   `readSnapshotOrFetch`. Add a comment above `preferredRegion` noting why:
   ```ts
   // Snapshot-backed: uses fs.readFile, must stay on Node.
   // preferredRegion keeps the function close to most users.
   export const preferredRegion = "iad1";
   ```

3. **Edge-candidate flag for follow-up.** The non-snapshot read routes
   (`/api/search`, `/api/wikidata`) are pure-fetch / pure-compute and could
   move to `runtime = "edge"`. Document them as a follow-up issue with a
   short test plan; do not migrate them in this phase (different risk
   profile — edge has fetch-API differences that need their own test pass).

### Tests
- `npm test` green (no test should be affected — these are deploy-time
  routing hints).
- `npm run build` must succeed (Next will type-check segment exports).

### Risks
- A region pinning that doesn't match user geography can make latency *worse*
  for some users. Measure with `curl -w "%{time_total}\n"` from at least two
  geographic vantages before keeping the pin. If you have Vercel Analytics,
  use it; otherwise pick `iad1` (the current default, so the change is a
  documented no-op rather than a behavior change).
- Forgetting `preferredRegion` is a literal string trips the build (it must
  not be computed from another variable).

### Definition of Done
- `npm test` green; `npm run build` succeeds.
- `curl -w "%{time_total}\n"` median for each migrated route is at least
  not-worse than before (record numbers in the commit message).
- `onboarding/12-deployment.md` explains region selection.
- Commit: `perf(api): preferredRegion on snapshot-backed routes`.

---

## Phase 6 — Mobile polish + a11y (LOW risk)

**Goal:** explicit mobile viewport, reduced-motion support, mobile-specific
CSS fixes.

### Modified files
- `src/app/layout.tsx`
- `src/app/globals.css`
- `onboarding/10-components-theming.md` (docs-as-you-go: reduced-motion rule)

### Step-by-step

1. **Explicit viewport in `layout.tsx`.** Next 16's preferred shape is a
   `viewport` export (Metadata-style):
   ```ts
   import type { Viewport } from "next";

   export const viewport: Viewport = {
     width: "device-width",
     initialScale: 1,
     viewportFit: "cover",                  // notch-safe
     interactiveWidget: "resizes-content",  // mobile keyboard doesn't squash the layout
     themeColor: [
       { media: "(prefers-color-scheme: dark)",  color: "#0a0a0a" },
       { media: "(prefers-color-scheme: light)", color: "#ffffff" },
     ],
   };
   ```
   Read the existing `metadata` export's surroundings before adding — Next 16
   wants `viewport` and `metadata` as separate exports.

2. **`prefers-reduced-motion`** at the bottom of `src/app/globals.css`:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.01ms !important;
       scroll-behavior: auto !important;
     }
   }
   ```
   This is a system-wide kill-switch — users with OS-level "reduce motion"
   on (an accessibility setting and a battery-saver heuristic on iOS) get
   instant transitions. Zero impact for everyone else.

3. **`100vw` audit.** `grep -rn "100vw\|w-screen" src/` and re-check each
   hit on mobile. `100vw` includes the scrollbar; `100%` or `100dvw` (dynamic
   viewport width, accounts for the iOS toolbar) is usually what's intended.
   If a layout horizontal-scrolls on mobile, this is why. Likely zero hits
   in a Tailwind v4 codebase — verify and move on.

4. **Test on a real mobile or Chrome DevTools mobile emulation** at a
   throttled "Fast 3G" preset:
   - Open `/`, `/standings`, `/schedule`, `/race/<year>/<round>`,
     `/drivers`, `/compare`.
   - Confirm no horizontal scroll.
   - Toggle OS "reduce motion" (or via DevTools Rendering tab → "Emulate CSS
     media feature prefers-reduced-motion") and confirm transitions are now
     near-instant.
   - On `/search` (or wherever the search bar lives), open the keyboard;
     the layout should NOT jump — `interactive-widget` is doing its job.

### Tests
- jsdom can't easily test viewport or media queries; coverage-wise, this
  phase is a manual / Lighthouse check.
- Run Lighthouse mobile against a preview URL; record the score deltas
  (Performance, Accessibility) in the commit message. Expect Accessibility
  +1 to +3 from the reduced-motion handling.

### Risks
- The new `viewport` export must be in the right format for Next 16; the
  `Viewport` type is your guardrail.
- `!important` in `prefers-reduced-motion` is intentional — animation libs
  often inline timings that need to be beaten.

### Definition of Done
- `npm test` green; `npm run build` succeeds.
- DevTools "Emulate CSS media feature prefers-reduced-motion: reduce"
  produces an instant-transition page.
- Lighthouse mobile run on a preview URL: Accessibility ≥ 95; Performance
  score recorded in commit message.
- `onboarding/10-components-theming.md` documents the reduced-motion rule.
- Commit: `perf(mobile): viewport + prefers-reduced-motion + safe-area`.

---

## Final verification (before opening a PR)

1. `npm run lint` — no new errors.
2. `npm test` — green, test count ≥ baseline 689 plus the small additions
   in P1/P3/P4.
3. `npm run test:ci` — coverage gate passes.
4. `npm run build` — succeeds and the first-load JS for
   `/race/[year]/[round]` is at least 120 kB gzip smaller than the baseline
   you recorded in §0.3.
5. **Manual Lighthouse mobile** run on a preview URL; record Performance and
   Accessibility scores in the PR description.
6. **Manual Network panel** on `/standings` and `/race/<year>/<round>`:
   zero `/api/*` requests on first paint (Phase 4 win).
7. **Manual `curl -I`** on every migrated route from Phase 3 confirms
   `Cache-Control: public, s-maxage=…, stale-while-revalidate=604800`.

## Risks & unknowns — verify during work, do not assume

| # | Risk | Mitigation |
|---|---|---|
| 1 | Removing `unoptimized` breaks an image whose host isn't in `remotePatterns` | P1 step 3: verify hosts before removing the flag |
| 2 | Layout shift from chart Skeleton dimension mismatch | P2 step 2: match `h-[Npx]` exactly to the loaded chart |
| 3 | A misclassified DataClass in P3 makes a route serve stale data | Always copy the DataClass already in use inside the route |
| 4 | queryKey drift between server prefetch and client useQuery is silent | DoD's Network panel check is the only real safety net |
| 5 | preferredRegion pinned to the wrong region makes some users slower | Measure from ≥2 geographic vantages before keeping the pin |
| 6 | The `viewport` export shape changes between Next majors | Use the typed `Viewport` import as your guardrail |

## Out of scope (do not do in this refactor)

- Service worker / PWA / offline (different threat model).
- `generateStaticParams` on circuit metadata routes (circuits can change
  mid-season for repaved tracks; snapshot tier already covers it).
- Splitting `RaceDetailClient` further (`docs/REFACTOR_HANDOFF.md` Phase 5
  targets this).
- Converting the 4 fully-client pages (`compare`, `drivers`, `news`,
  `projections`) to server+hydrate — behavior-changing, separate task.
- Migrating non-snapshot routes (`/api/search`, `/api/wikidata`) to
  `runtime = "edge"` — different test profile, flagged as follow-up in P5.
