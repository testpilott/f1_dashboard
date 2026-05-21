# F1 Dashboard — Engineering Handoff: QA Refactor (8 Phases)

> **Read this whole document first, then work strictly top-to-bottom.** It is
> self-contained: every phase has exact file paths, the code to write, step-by-step
> instructions, the tests to run, and a "Definition of Done" you can verify yourself.
> Do not start a phase until the previous phase's DoD is green.

> **Background:** the six feature workstreams that used to live in this document
> (WS-1…WS-6: schedule divider, circuit markers, standings modal, compare context,
> driver photos, driver stats) are **shipped on `main`**. Their spec is preserved in
> git history. This document now describes the **QA refactor** that follows them.

---

## 0. Orientation

### 0.1 What you are doing, and why

You are paying down three kinds of technical debt **without changing any behaviour**:

1. **Duplicated internal logic** — the same helper functions are copy-pasted across
   files, so a fix in one place silently misses the others.
2. **Repeated API boilerplate** — all 19 API routes hand-roll the same skeleton.
3. **God-object components** — four UI files have grown so large that pure logic is
   trapped inside JSX where it cannot be unit-tested.

The end state: one source of truth per helper, pure logic extracted into tested
`src/lib` modules, components small enough to read in one screen, and a shared
`src/test/` toolkit. The app must look and behave **exactly** as it does today.

### 0.2 The stack

Next.js 16 (App Router, **modified** — see 0.6), React 19, TypeScript, Tailwind v4,
React Query v5, Vitest 2.x. Data comes from three free APIs proxied through our own
`/api/*` routes: Jolpica/Ergast, OpenF1, OpenMeteo. No database, no auth.

### 0.3 Branch & setup

```bash
git fetch origin
git checkout -b refactor/qa-pass origin/main   # always branch from origin/main
npm install
npm test                                       # confirm a GREEN baseline first
```

Commit once per phase (or a short series within a phase). Never push a red suite.

### 0.4 Phase order — DO NOT REORDER

```
Phase 1  Stats helpers        ─┐
Phase 2  API fetchers          │ internals — fully verified by `npm test`
Phase 3  Test infrastructure   │
Phase 4  API route helpers    ─┘
Phase 5  StandingsTables      ─┐
Phase 6  drivers/page          │ god objects — must also be browser-checked
Phase 7  compare/page          │
Phase 8  CircuitMap           ─┘
```

Phase 3 must come before Phases 5-8 so the new component tests use the shared
toolkit. Phase 1 must come before Phase 7 (it reuses Phase 1's parsing helpers).

### 0.5 Non-negotiable conventions

1. **TDD.** `npm test` must exit 0 before every commit. Every new function in
   `src/lib/` gets one positive test and one edge-case test. Never use `--no-verify`,
   never comment out a failing test, never lower the coverage gate.
2. **Behaviour must not change.** This is a refactor. The existing test suite is your
   safety net — if a test you did not intend to touch goes red, you changed
   behaviour. Stop, understand why, and fix the code (not the test).
3. **Coverage gate.** `vitest.config.ts` enforces ≥80% lines/functions/statements and
   ≥75% branches over `src/lib/**/*.ts`. Every new file under `src/lib/` is measured.
4. **No hardcoded colours in JSX/TSX** — design tokens only. (The hex array in
   `CircuitMap.tsx`'s `SECTORS` is pre-existing debt; do not touch it, do not copy it.)
5. **Test environment.** Node tests for `src/lib/` + `src/app/api/` logic; jsdom for
   components (file name ends `.test.tsx`). Mock at the `fetch` / React Query boundary.

### 0.6 "Modified Next.js"

This repo runs a customised Next.js 16. Before using a framework API you are unsure
about, read the matching guide in `node_modules/next/dist/docs/`.

### 0.7 Reference patterns to copy

| You are building | Study first |
|---|---|
| A pure stats helper + its test | `src/lib/stats/constructorH2H.ts` (+ test) |
| An API route | `src/app/api/compare/route.ts` |
| A presentational UI component | `src/components/ui/table.tsx` |
| A jsdom component test | `src/components/standings/__tests__/StandingsTables.test.tsx` |

### 0.8 Build sandbox note

`npm run build` may fail in a network-restricted environment because some pages
fetch live APIs at build time — this is environmental, not your bug. `npm test` is
your hard gate. For Phases 5-8 you must also run `npm run dev` and check the page in
a real browser (see each phase's DoD).

---

## Phase 1 — Consolidate stats helpers

**Goal:** one source of truth for the result-status predicates and number parsing
that are currently copy-pasted across the `src/lib/stats/` files.

**Why:** `isFinished` and `mean` are byte-identical in `form.ts` and `headToHead.ts`;
`driverSeason.ts` re-implements the same idea with subtly different logic. A bug fix
in one copy misses the others.

### New files

**`src/lib/stats/common.ts`**
```ts
/**
 * Shared race-result predicates and maths. Single source of truth —
 * do not re-declare these locally in other stats files.
 */

/** A result is "classified as finished" when status is "Finished" or "+N Lap(s)". */
export function isFinished(status: string | undefined): boolean {
  if (!status) return false;
  return status === "Finished" || /^\+\d+\s+Lap/.test(status);
}

/** A result is a DNF when it is not classified as finished. */
export function isDnf(status: string | undefined): boolean {
  return !isFinished(status);
}

/** Arithmetic mean; empty array → 0. */
export function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length;
}
```

**`src/lib/stats/parsing.ts`**
```ts
/**
 * Consistent parsing of Jolpica/Ergast string fields ("1", "25.0", "0").
 * Each helper applies a fixed fallback so downstream maths never sees NaN.
 */

/** Finishing/grid position → integer; missing/garbage → 99 ("at the back"). */
export function parsePosition(value: string | undefined): number {
  const n = parseInt(value ?? "99", 10);
  return Number.isFinite(n) ? n : 99;
}

/** Championship points → number; missing/garbage → 0. */
export function parsePoints(value: string | undefined): number {
  const n = parseFloat(value ?? "0");
  return Number.isFinite(n) ? n : 0;
}

/** Grid slot → integer; missing/garbage → 0 (0 also means a pit-lane start). */
export function parseGrid(value: string | undefined): number {
  const n = parseInt(value ?? "0", 10);
  return Number.isFinite(n) ? n : 0;
}
```

### Steps

1. Create both files above.
2. Write `src/lib/stats/__tests__/common.test.ts` and `parsing.test.ts` (see Tests).
   Run `npm test` — the two new suites pass.
3. In `src/lib/stats/form.ts`: delete the local `isFinished` and `mean`; add
   `import { isFinished, mean } from "./common";`.
4. In `src/lib/stats/headToHead.ts`: delete the local `isFinished` and `mean`; import
   from `./common`.
5. In `src/lib/stats/driverSeason.ts`: delete the local `isDnf`; import from
   `./common`. **Note** its old `isDnf` took a `RaceResult` object — the new one takes
   a status string, so change the call site from `isDnf(result)` to
   `isDnf(result.status)`.
6. In `constructorH2H.ts`: if it has a local finished/DNF predicate, import instead.
7. **Parsing swaps — apply the safe rule below, then run `npm test` after each file.**
   - Swap a `parseFloat`/`parseInt` call to a `parsing.ts` helper **only when the
     existing line already supplies the exact same fallback** (look for `?? "99"`,
     `?? "0"`, or a `Number.isFinite` guard defaulting to the same value).
   - `driverSeason.ts` lines that read `parseInt(result.position ?? "99", 10)`,
     `parseInt(result.grid ?? "0", 10)`, `parseFloat(result.points ?? "0")` are exact
     1:1 swaps → `parsePosition`/`parseGrid`/`parsePoints`.
   - For `points`, the swap to `parsePoints` is always safe.
   - **Leave alone** any bare `parseInt(x, 10)` whose result is later checked with
     `Number.isFinite` to *skip* a missing value (e.g. the head-to-head comparison
     loop in `headToHead.ts`) — that code needs to distinguish "missing".
   - **The test suite is the gate:** if a swap turns a stats test red, you changed
     behaviour — revert that one swap.
8. `npm test` fully green → commit.

### Tests

- `common.test.ts`: `isFinished` for `"Finished"`, `"+1 Lap"`, `"+2 Laps"`,
  `"Collision"`, `undefined`, `""`; `isDnf` is the inverse; `mean` for a normal array
  and `[]` → 0.
- `parsing.test.ts`: each parser for a normal string, `undefined`, and a non-numeric
  string → the documented fallback.

### Definition of Done

`common.ts` + `parsing.ts` exist with full tests; no `src/lib/stats/` file declares
its own `isFinished`/`isDnf`/`mean`; `npm test` green; coverage gate still passes.

---

## Phase 2 — Unify external-API fetchers

**Goal:** one fetch wrapper factory instead of three near-identical hand-rolled ones.

**Why:** `jolpicaFetch` (`jolpica.ts`), `openF1Fetch` (`openf1.ts`) and the inline
fetch in `multiviewer.ts` repeat the same timeout + header + non-OK-throw + JSON code.

### New file

**`src/lib/api/createApiFetcher.ts`**
```ts
import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";

/**
 * Build a typed fetch wrapper for one external API. The wrapper applies the
 * shared timeout, JSON Accept header, non-OK → throw, and JSON parse.
 */
export function createApiFetcher(baseUrl: string, serviceName: string) {
  return async function apiFetch<T>(path: string, revalidate: number): Promise<T> {
    const res = await fetchWithTimeout(`${baseUrl}${path}`, {
      next: { revalidate },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`${serviceName} fetch failed: ${res.status} ${path}`);
    }
    return res.json() as Promise<T>;
  };
}
```

### Steps

1. Create the file and `src/lib/api/__tests__/createApiFetcher.test.ts` (see Tests).
2. In `jolpica.ts`, replace the body of `jolpicaFetch` with:
   ```ts
   const jolpicaApi = createApiFetcher(JOLPICA_BASE, "Jolpica");
   async function jolpicaFetch<T>(path: string, dataClass: DataClass = "standings"): Promise<T> {
     return jolpicaApi<T>(path, adaptiveRevalidate(dataClass));
   }
   ```
3. In `openf1.ts`, similarly:
   ```ts
   const openF1Api = createApiFetcher(OPENF1_BASE, "OpenF1");
   async function openF1Fetch<T>(path: string): Promise<T> {
     return openF1Api<T>(path, adaptiveRevalidate("telemetry"));
   }
   ```
4. In `multiviewer.ts`, build `const multiviewerApi = createApiFetcher(MULTIVIEWER_BASE,
   "Multiviewer");` and call it with `revalidate: 86400`. The thrown message now
   reads `Multiviewer fetch failed: {status} /circuits/{key}/{year}` — the circuit key
   is still present (in the path), so this is acceptable.
5. In `openmeteo.ts`: its historical-data call uses bare `fetch(...)`. Change it to
   `fetchWithTimeout(...)` so all three external APIs share the timeout guard
   (`docs/architecture.md` states they all should). Leave its query-string building
   as-is; it does not need to adopt `createApiFetcher`.
6. `npm test` green → commit.

### Tests

`createApiFetcher.test.ts` — mock the fetch boundary (`vi.mock` of
`fetchWithTimeout`): an OK response resolves to the parsed JSON; a non-OK response
throws an `Error` whose message contains the service name, status, and path.

### Definition of Done

`createApiFetcher.ts` exists with tests; `jolpica.ts`/`openf1.ts`/`multiviewer.ts`
use it; `openmeteo.ts` uses `fetchWithTimeout` for both calls; `npm test` green.

---

## Phase 3 — Shared test infrastructure

**Goal:** a `src/test/` toolkit so tests stop copy-pasting setup.

**Why:** `withQuery()` is duplicated in 8+ component tests; `mkRace`/`makeRace`/
`makeStanding` factories are re-declared 7+ times; fetch mocking is ad-hoc per file.

### New files

**`src/test/render.tsx`**
```tsx
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/** Wrap a component tree in a fresh React Query provider (retries off for tests). */
export function withQuery(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}
```

**`src/test/fetch.ts`**
```ts
import { vi } from "vitest";

/**
 * Fake `global.fetch` that routes by URL substring (first match wins).
 * Unmatched URLs return 404.
 *
 *   global.fetch = createFetchRouter({ "/api/form": { items: [] } });
 */
export function createFetchRouter(routes: Record<string, unknown>): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    for (const [pattern, body] of Object.entries(routes)) {
      if (url.includes(pattern)) {
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    return new Response(JSON.stringify({ error: "not mocked" }), { status: 404 });
  }) as unknown as typeof fetch;
}
```

**`src/test/api.ts`**
```ts
/** Build a Request for an API-route handler test. */
export function makeApiRequest(path: string, params: Record<string, string> = {}): Request {
  const qs = new URLSearchParams(params).toString();
  return new Request(`http://localhost${path}${qs ? `?${qs}` : ""}`);
}
```

**`src/test/fixtures.ts`** — typed factories with an `overrides` argument. Build one
per core domain type; consolidate the scattered `mkRace`/`makeRace`/`makeStanding`
copies here. Example shape:
```ts
import type { Race, DriverStanding } from "@/lib/types";

export function makeRace(overrides: Partial<Race> = {}): Race {
  return {
    season: "2026", round: "1", raceName: "Test Grand Prix",
    Circuit: { circuitId: "test", circuitName: "Test Circuit",
      Location: { lat: "0", long: "0", locality: "Test", country: "Testland" } },
    date: "2026-03-01", Results: [],
    ...overrides,
  } as Race;
}
// …makeRaceResult, makeDriver, makeDriverStanding, makeConstructorStanding
```
Copy the *exact* field defaults from the existing inline factories so no test's data
shape changes. Match each domain type in `src/lib/types/`.

### Steps

1. Create the four files above. `src/test/` is outside `src/lib/`, so it is not
   coverage-gated and Vitest will not treat these as test suites (no `.test.` suffix).
2. Migrate test files **one at a time**, committing in small batches:
   - Replace each local `withQuery` with `import { withQuery } from "@/test/render";`.
   - Replace each local `mkRace`/`makeRace`/etc. with the `@/test/fixtures` factory.
   - Replace ad-hoc `String(url).includes(...)` fetch mocks with `createFetchRouter`.
   - Replace local `makeReq`/`makeRequest` with `makeApiRequest`.
   - Run `npm test` after each file — it must stay green (the test still asserts the
     same things; only its setup changed).
3. **Trim `src/app/api/__tests__/validation.test.ts`** (currently ~490 lines):
   collapse runs of equivalent assertions (e.g. five different valid 4-digit years)
   to one or two representative cases. **Keep every SQL-injection / XSS case** — those
   document security intent. The file should shrink substantially with the same
   protective coverage.
4. `npm test` fully green → final commit for the phase.

### Definition of Done

`src/test/` has the four helpers; no component test declares its own `withQuery`; no
stats/API test declares its own race/standing factory; `validation.test.ts` is
materially shorter but still covers every injection case; `npm test` green.

---

## Phase 4 — API route boilerplate → lightweight helpers

**Goal:** remove the repeated response-construction and error-handling code from all
19 `src/app/api/**/route.ts` handlers.

**Why:** every route hand-writes `NextResponse.json({ error }, { status })` and an
identical `catch` block, with inconsistent variable names (`blocked` vs `limited`).

> **Approach: lightweight helpers, NOT a higher-order wrapper.** Each route keeps its
> explicit, greppable `GET` function. We only factor out the response construction.

### New file

**`src/lib/api/routeHelpers.ts`**
```ts
import { NextResponse } from "next/server";

/** Standard 400 response. Pass the SAME message the route uses today. */
export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

/** Standard 500 response with consistent server-side logging. */
export function serverError(routeName: string, err: unknown): NextResponse {
  console.error(`[/api/${routeName}] Error:`, err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
```

### Steps

1. Create `routeHelpers.ts` and `src/lib/api/__tests__/routeHelpers.test.ts`.
2. For **each** of the 19 routes:
   - Replace every `return NextResponse.json({ error: "<msg>" }, { status: 400 })`
     with `return badRequest("<msg>")` — **pass the identical message string** so
     behaviour does not change.
   - Replace the `catch` block's body with `return serverError("<route-name>", err)`.
     Use the route's existing log label as `<route-name>`.
   - Standardise the rate-limit variable name to `blocked`:
     `const blocked = rateLimited(req, "<route-name>"); if (blocked) return blocked;`
   - Leave the success path, status codes, and all message strings exactly as they
     are. Routes that return `200` with `{ available: false }` (`team-radio`,
     `circuit-info`, `race-incidents`), the `.ics` route (`schedule/export`), and
     `logo` keep their bespoke success responses untouched — only their 400/500
     branches use the helpers.
   - Run `npm test` after each route.
3. `npm test` fully green → commit (you may split into 2-3 commits across the routes).

### Tests

`routeHelpers.test.ts` — `badRequest` returns status 400 with `{ error }`;
`serverError` returns status 500 with `{ error }` and the route name appears in the
logged output (spy on `console.error`). Every existing API-route test must stay green
unchanged — you changed how the response is built, not what it contains.

### Definition of Done

All 19 routes import from `routeHelpers.ts`; no route hand-writes a 400/500
`NextResponse`; the rate-limit variable is `blocked` everywhere; `npm test` green.

---

## Phases 5-8 — Splitting the god objects

Phases 5-8 all follow the **same extraction recipe**. Read it once here:

> **Extraction recipe.** To move an inline sub-component or helper out of a large
> file: (1) create the new file; (2) **cut** the function/component verbatim — do not
> rewrite its logic; (3) add the imports it needs at the top of the new file; (4) add
> `"use client"` as the first line **only if** the moved code uses React hooks
> (`useState`, `useQuery`, `useEffect`, …) — purely presentational components do not
> need it; (5) `export` it; (6) in the original file, delete the moved code and add an
> `import`; (7) run `npm test`. Behaviour must not change.

For every god-object phase: after `npm test` is green, **also run `npm run dev` and
open the affected page in a browser** — check it at mobile and desktop widths, in
dark and light mode, and confirm it behaves identically to before.

---

## Phase 5 — God object: `StandingsTables.tsx` (372 lines)

**Goal:** extract the four inline sub-components; the file should drop to ~180 lines.

### Steps

1. Using the extraction recipe, create each of these from the matching inline
   definition in `src/components/standings/StandingsTables.tsx`:
   - `src/components/standings/PositionBadge.tsx` — presentational, no `"use client"`.
   - `src/components/standings/FormChip.tsx` — presentational, no `"use client"`.
   - `src/components/standings/StandingsSkeleton.tsx` — presentational.
   - `src/components/standings/DriverSeasonDialog.tsx` — uses `useState`/`useQuery`,
     so it **needs** `"use client"`.
2. Replace the removed definitions in `StandingsTables.tsx` with imports.
3. The drivers table and the constructors table share ~118 near-identical lines.
   Extract a shared piece **only if it stays clean** (e.g. a small `StandingsRow` or a
   table shell). If making it generic would need a leaky column-config abstraction,
   **leave the two tables as they are** — a little duplication beats a confusing
   abstraction.
4. `npm test` green; browser-check `/standings` (both tabs, row click → modal).

### Tests

Add `FormChip.test.tsx` (renders the up/down/flat trend correctly) and
`PositionBadge.test.tsx` (medal styling for P1-3 vs plain), using `@/test/render`.
`StandingsTables.test.tsx` must stay green.

### Definition of Done

The four components are their own files; `StandingsTables.tsx` is ~180 lines or
fewer; `npm test` green; `/standings` verified in the browser, behaviour unchanged.

---

## Phase 6 — God object: `drivers/page.tsx` (495 lines)

**Goal:** extract the 232-line inline `DriverDetailPanel` and its helpers.

### Steps

1. Extract, per the recipe:
   - `src/components/drivers/DriverDetailPanel.tsx` — uses hooks → `"use client"`.
   - `src/components/drivers/DriverHeadshot.tsx` — presentational.
   - `src/components/drivers/StatBox.tsx` — presentational.
2. If `DriverDetailPanel.tsx` is still long after the move, extract its news section
   to `src/components/drivers/DriverNews.tsx`. If it reads cleanly, leave it.
3. Move the inline age calculation into a tiny pure helper (e.g.
   `src/lib/stats/age.ts` — `ageFromDateOfBirth(dob: string, now?: Date): number`) so
   it can be unit-tested. Reuse an existing date utility if one already fits.
4. Keep the lazy "fetch on selection" `useQuery` pattern exactly as it is.
5. `npm test` green; browser-check `/drivers` (grid, select a card → panel, mobile).

### Tests

`age.ts` gets a node test (a known DOB → expected age; a birthday-not-yet-passed
edge case). Add a `DriverDetailPanel.test.tsx` covering "select a driver → season and
career blocks load". `DriversPage.test.tsx` stays green.

### Definition of Done

`DriverDetailPanel`/`DriverHeadshot`/`StatBox` are their own files; age logic is a
tested `src/lib` helper; `src/app/drivers/page.tsx` is materially smaller; `npm test`
green; `/drivers` verified in the browser.

---

## Phase 7 — God object: `compare/page.tsx` (565 lines)

**Goal:** the biggest win of the refactor — move the head-to-head *maths* out of JSX
into a pure, tested module.

### Steps

1. Create **`src/lib/stats/circuitHeadToHead.ts`**. Move the inline circuit
   head-to-head aggregation (the ~65 lines that tally wins, podiums, qualifying and
   time deltas — currently computed inside the JSX of `compare/page.tsx`) into a pure
   function. Suggested signature:
   ```ts
   export interface CircuitHeadToHead {
     winsA: number; winsB: number;
     podiumsA: number; podiumsB: number;
     qualiAheadA: number; qualiAheadB: number;
     // …match the fields the page currently computes
   }
   export function circuitHeadToHead(history: CircuitComparisonRow[]): CircuitHeadToHead;
   ```
   Reuse Phase 1's `parsePosition` / `parsePoints`. This file joins the existing
   `headToHead.ts` / `constructorH2H.ts` family — copy their style.
2. Replace the inline computation in `compare/page.tsx` with a call to
   `circuitHeadToHead(...)`.
3. Extract the sub-components per the recipe:
   - `src/components/compare/StatBar.tsx` — presentational.
   - `src/components/compare/PositionBadge.tsx` (the inline `Pos`) — presentational.
   - `src/components/compare/DriversCompareTab.tsx` — uses hooks → `"use client"`.
   - `src/components/compare/TeamsCompareTab.tsx` — uses hooks → `"use client"`.
   The page keeps only tab routing and shared state.
4. `npm test` green; browser-check `/compare` (both tabs, pick drivers/teams).

### Tests

`circuitHeadToHead.test.ts` (node) — a multi-race history where A wins more; an empty
history → all zeros; a one-sided history; a tie. `ComparePage.test.tsx` stays green.

### Definition of Done

`circuitHeadToHead.ts` exists with full tests and no maths remains inside the compare
JSX; the four components are their own files; `npm test` green; `/compare` verified.

---

## Phase 8 — God object: `CircuitMap.tsx` (611 lines)

**Goal:** extract the geometry maths (currently **untested**) and the `TrackSVG`
sub-component.

### Steps

1. Create **`src/lib/geometry/track.ts`**. Move these functions from
   `CircuitMap.tsx` **verbatim** (do not rewrite the maths):
   - `rotatePoint(x, y, cx, cy, deg)` — 2D rotation about a centre.
   - `buildPolylinePoints(...)` — SVG polyline string builder.
   - `splitBySectors(...)` — splits the track polyline into sector segments.
   - `getSectorId(...)` — classifies a point/index into a sector.
   Export each one. `src/lib/geometry/` is coverage-gated, so this code now must be
   tested — that is the point.
2. Extract the ~200-line inline `TrackSVG` into
   `src/components/race/TrackSVG.tsx` (it renders SVG and may use hooks → check, and
   add `"use client"` if so).
3. Collapse the duplicated selected-vs-unselected corner-marker rendering (the two
   near-identical blocks around `CircuitMap.tsx` lines 283-339) into one render path
   parameterised by a `selected` boolean.
4. Do **not** touch the `SECTORS` hex array — pre-existing debt, out of scope.
5. `npm test` green; browser-check `/race/2023/<round>` → Circuit tab (track renders,
   corners highlight, incident markers clickable).

### Tests

`src/lib/geometry/__tests__/track.test.ts` (node) — `rotatePoint` for 0° (identity),
90° and 180° about a known centre; `splitBySectors` produces the expected number of
segments for a short known polyline; `getSectorId` at sector boundaries.

### Definition of Done

`src/lib/geometry/track.ts` exists with full tests; `TrackSVG` is its own file;
corner-marker rendering is no longer duplicated; `npm test` green and the coverage
gate still passes; the Circuit tab verified in the browser.

---

## Appendix — Further opportunities (not in this handoff)

These were noted during the QA review but are out of scope. Raise them with your lead
before picking them up:

- `ScheduleClient.tsx` (306 lines) and `WeekendClient.tsx` (280 lines) have the same
  inline-sub-component + inline-date-util smell — a natural "Phase 9".
- Component tests are mostly smoke tests and are excluded from the coverage gate
  (`vitest.config.ts`). With `src/test/` now in place, adding interaction and
  error-path component tests is cheap.
- `src/lib/drivers-static.ts` (342 lines of hand-keyed data) is acceptable under the
  free-tier no-database constraint — flagged only for awareness.

## Final verification (after Phase 8)

```bash
npm test          # exits 0, coverage gate green
npm run build     # passes in a network-enabled environment
```

Then browser-check every refactored page — `/standings`, `/drivers`, `/compare`,
`/race/[year]/[round]` Circuit tab — at mobile and desktop widths, dark and light
mode. Nothing should look or behave differently from `main` before the refactor:
that is the definition of a successful refactor.
