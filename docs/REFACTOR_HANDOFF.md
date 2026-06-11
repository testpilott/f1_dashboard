# DRY / God-Object Refactor — Junior-Engineer Handoff (9 Phases)

> **Read this first, then work strictly top-to-bottom.** Every phase has exact
> file paths, step-by-step instructions, tests to write, risks to watch, and a
> Definition of Done you can verify yourself. **Do not start a phase until the
> previous phase's DoD is green.**

---

## 0. Orientation

### 0.1 What you are doing, and why

This is a **behavior-preserving refactor**. No feature changes, no visual
changes, no API-shape changes. The dashboard works (689 tests green), but three
audits found structural debt that makes every enhancement slower than it
should be:

| Problem | Evidence |
|---|---|
| **God objects** | 8 files over 220 lines mixing fetching + state + inline sub-components (`CircuitMap.tsx` 323L, `ScheduleClient.tsx` 306L, `DriversCompareTab.tsx` 305L, `RaceDetailClient.tsx` 293L, `WeekendClient.tsx` 280L, `DriverDetailPanel.tsx` 267L, `drivers/page.tsx` 237L, `jolpica.ts` 306L) |
| **DRY violations** | `MRData…Races[0]?.X ?? []` unwrap repeated 9×; pagination loop duplicated 2×; snapshot payload shapes duplicated between `tools/` writers and routes — **this exact drift already caused a production outage** (the June driver-career shape bug); client `fetch().then(r=>r.json())` repeated 5+×; 15 test files re-mock jolpica individually; two unrelated components share the name `PositionBadge` |
| **Readability** | 48 call sites on legacy `DataClass` keys; `getSeasonResults` vs `getSeasonRaceResults` differ only by page size; try-inside-catch in the driver-career route; vestigial `WARMED_SEASONS`; `SeasonPicker` hardcodes `2026 - i` |

**The measure of success:** after every phase, `npm test` exits 0 with the same
(or higher) test count, `npm run build` passes, and the rendered app is
pixel-identical.

### 0.2 Branch & setup

```bash
git fetch origin
git checkout -b refactor/dry-sweep origin/main
npm install
npm test          # green baseline (~689 tests) before touching anything
```

Commit per phase. Never push a red suite. The husky pre-commit hook runs the
full suite — do not bypass it.

### 0.3 Phase order — DO NOT REORDER

```
P1 (utilities/constants) ──▶ P2 (jolpica internals) ──▶ P3 (snapshot types) ──▶ P7 (routes)
   │                                                                              │
   └──▶ P5 (component extraction, no fetch) ──▶ P6 (fetch-owning hooks) ◀── P4 (client fetch + test infra)
                                                                                  │
                                                              P8 (DataClass keys) ◀┘
                                                                                  │
                                                              P9 (docs sweep) ◀───┘
```

P4 has no dependencies and can run any time before P6.

### 0.4 Non-negotiable conventions

1. **TDD.** Tests first or alongside. Coverage gate: ≥80% lines/fns/stmts,
   ≥75% branches on `src/lib/**/*.ts` (`npm run test:ci`).
2. **Behavior-preserving.** If a jsdom test needs its *assertions* changed (not
   just its imports), you changed behavior — stop and re-check.
3. **Design tokens only** in any JSX you move. Moving code is not a license to
   reformat it; keep diffs mechanical so review is easy.
4. **Docs-as-you-go.** Every phase's DoD includes updating the onboarding
   chapter(s) that describe what you changed (named per phase). Phase 9 is a
   final consistency sweep, not a from-scratch rewrite.
5. **AGENTS.md rules** (route guardrails, cacheStrategy DataClass rules,
   segment-config literals) all still apply.

### 0.5 Reference patterns to copy

| Need | Copy from |
|---|---|
| Pure helper + test style | `src/lib/stats/common.ts` + its test |
| Hook extraction with renderHook test | `src/hooks/useFavorites.ts` + test |
| Hoisted mock factory | `vi.hoisted` usage in `tools/__tests__/snapshot-weekly.test.ts` |
| Frozen-time test | AGENTS.md rule: `vi.setSystemTime()` — no raw `new Date()` in assertions |
| House handoff format (this doc) | `docs/JOLPICA_RATELIMIT_HANDOFF.md` |

---

## Phase 1 — Pure utilities & magic values (LOW risk)

**Goal:** move pure logic out of components into tested `src/lib` modules;
name the magic values.

### New files
- `src/lib/time/format.ts` (+ `src/lib/time/__tests__/format.test.ts`)
- `src/lib/api/jolpicaLimits.ts`

### Modified files
- `src/components/schedule/ScheduleClient.tsx`
- `src/lib/season.ts` (+ its test)
- `src/components/ui/SeasonPicker.tsx`
- `src/lib/projections/snapshot.ts` (+ its test)
- `onboarding/02-project-structure.md` (docs-as-you-go)

### Step-by-step

1. **Extract time utils.** `ScheduleClient.tsx` defines three pure functions at
   lines ~18–58: `buildUTCDate(date, time?)`, `formatInTz(date, tz)`,
   `formatCountdown(ms)`. Move them verbatim to `src/lib/time/format.ts` as
   named exports; import them back into `ScheduleClient`. Write
   `format.test.ts` FIRST: `buildUTCDate` with and without a time string;
   `formatInTz` for a known instant in two zones; `formatCountdown` for
   0 ms / minutes / hours / multi-day (freeze time where relevant).
2. **Name the Jolpica limits.** Create `src/lib/api/jolpicaLimits.ts`:
   ```ts
   /** Page sizes for Jolpica queries. Names say WHY, not just how many. */
   export const LIMIT_FULL_GRID = 30;        // covers every current-season driver/race
   export const LIMIT_CONSTRUCTORS = 15;
   export const LIMIT_RACE_ENTRIES = 25;     // one race's classified entries
   export const LIMIT_COUNT_ONLY = 1;        // we only read MRData.total
   export const LIMIT_PAGE = 100;            // paginated endpoints' page size
   export const LIMIT_MAX = 1000;            // Ergast hard max — whole season in one call
   export const CURRENT_SEASON = "current";  // Jolpica's alias for the running season
   ```
   Sweep `src/lib/api/jolpica.ts` replacing the literals (`?limit=30` →
   `` `?limit=${LIMIT_FULL_GRID}` `` etc.) and the three `season = "current"`
   defaults with `CURRENT_SEASON`. Mechanical; no logic change.
3. **SeasonPicker.** `src/components/ui/SeasonPicker.tsx:6` hardcodes
   `Array.from({ length: 6 }, (_, i) => String(2026 - i))`. Add to
   `src/lib/season.ts`:
   ```ts
   /** The seasons offered by the SeasonPicker dropdown (most recent 6).
    *  NOT the same as SEASON_OPTIONS (full 1950+ list used for validation). */
   export const RECENT_SEASONS: string[] = SEASON_OPTIONS.slice(0, 6);
   ```
   Import it in SeasonPicker. **Do not** use full `SEASON_OPTIONS` — that would
   grow the dropdown to 77 entries (a behavior change). Add a test:
   `RECENT_SEASONS` has length 6 and `RECENT_SEASONS[0] === SEASON_OPTIONS[0]`.
4. **Delete `WARMED_SEASONS`.** In `src/lib/projections/snapshot.ts`, the
   `WARMED_SEASONS` Set, `isSnapshotWarmed`, and `_resetSnapshotState` are
   advisory diagnostics no production code consults. Delete them and the
   `WARMED_SEASONS.add(...)` line in `warmSnapshot`; update/remove the tests
   that referenced them. Verify with `grep -rn "isSnapshotWarmed\|WARMED_SEASONS" src/`
   → only the deleted file's history.

### Risks
- `formatInTz` behavior depends on the Node ICU build; the test must assert
  against a fixed instant + explicit IANA zone, not "local" time.
- Don't "improve" `formatCountdown` formatting while moving it — pixel parity.

### Definition of Done
- `npm test` green; new `format.test.ts` passing; coverage gate passes.
- `grep -n "limit=[0-9]" src/lib/api/jolpica.ts` → no raw literals left.
- `grep -rn "2026 - i" src/components/` → empty.
- `onboarding/02-project-structure.md` lists `src/lib/time/format.ts` and
  `src/lib/api/jolpicaLimits.ts`.
- Commit: `refactor(lib): extract time utils + named jolpica limits`.

---

## Phase 2 — `jolpica.ts` internals (LOW-MED risk)

**Goal:** collapse the 9 envelope-unwrap repeats and the 2 pagination loops
into tested generic helpers; extract championship verification.

### New files
- `src/lib/api/mrData.ts` (+ `src/lib/api/__tests__/mrData.test.ts`)
- `src/lib/api/championshipVerification.ts` (+ test)

### Modified files
- `src/lib/api/jolpica.ts`
- `onboarding/05-data-fetching.md` (docs-as-you-go)

### Step-by-step

1. **The unwrap helper.** `jolpica.ts` repeats
   `data.MRData.RaceTable.Races[0]?.X ?? []` nine times (Results,
   QualifyingResults, SprintResults ×2 each at circuit, Laps, PitStops) plus
   `Races[0] ?? null` twice. Create `src/lib/api/mrData.ts`:
   ```ts
   export type RaceFieldEnvelope<K extends string, V> =
     { MRData: { RaceTable: { Races: Array<Partial<Record<K, V[]>>> } } };

   /** First race's field, or [] when the race or field is absent. */
   export function firstRaceField<K extends string, V>(
     data: RaceFieldEnvelope<K, V>, field: K): V[] {
     return data.MRData.RaceTable.Races[0]?.[field] ?? [];
   }

   export type RacesEnvelope<R> = { MRData: { RaceTable: { Races: R[] } } };

   /** First race object, or null. */
   export function firstRace<R>(data: RacesEnvelope<R>): R | null {
     return data.MRData.RaceTable.Races[0] ?? null;
   }
   ```
   Tests (write first): field present → array returned; race missing → `[]`;
   field missing on race → `[]`; `firstRace` with empty Races → `null`.
   Then sweep the 11 call sites, e.g.:
   ```ts
   return firstRaceField<"Results", RaceResult>(data, "Results");
   ```
   `mrData.ts` is inside the coverage gate (`jolpica.ts` itself is
   coverage-excluded) — that's the point: the shared logic becomes tested.
2. **The pagination helper.** `getAllRaceResultsAtCircuit` (lines ~203–252) and
   `getRaceLaps` (lines ~255–284) duplicate the same
   `limit/offset/total`-with-NaN-guards loop. Add to `mrData.ts`:
   ```ts
   export interface MRPage { total: string; offset: string; limit: string }

   /** Walk a paginated MRData endpoint. `fetchPage(offset)` returns the raw
    *  envelope; `extractRows` pulls the rows out of one page. Stops when a
    *  page is empty or offset passes total. */
   export async function paginateMRData<TEnvelope extends { MRData: MRPage }, TRow>(
     fetchPage: (offset: number) => Promise<TEnvelope>,
     extractRows: (page: TEnvelope) => TRow[],
     pageSize: number,
   ): Promise<TRow[]>
   ```
   Port the existing loop body verbatim (including the NaN fallbacks and the
   `rows.length === 0` break — they are 429-resilience, keep them). Tests:
   single page; multi page; empty first page; malformed `total` (NaN) stops
   the loop. Rewrite both callers on top of it — **the circuit merge/dedupe
   logic stays in `getAllRaceResultsAtCircuit`**, only the loop moves.
3. **Championship verification.** Lines ~136–188 of `jolpica.ts`
   (`getDriverCareerChampionships` internals: floor short-circuit, per-season
   fan-out with a 4-worker pool) move to
   `src/lib/api/championshipVerification.ts` as:
   ```ts
   export async function verifyChampionships(
     driverId: string,
     floor: number,
     deps: {
       getSeasons: (id: string) => Promise<number[]>;
       countTitleInSeason: (id: string, season: number) => Promise<number>;
     },
   ): Promise<number>
   ```
   Dependency-injected so the test needs no jolpica mocks: floor 0
   short-circuit; observed > floor wins; all-season-checks-fail returns floor;
   `getSeasons` throwing returns floor. `jolpica.ts` keeps a thin
   `getDriverCareerChampionships` that wires the real fetchers in — **the
   export name must not change** (15 test files mock it by name).
4. **Naming.** Add JSDoc to `getSeasonResults` ("first 30 rows only — kept for
   projections' exact behavior") and `getSeasonRaceResults` ("whole season,
   limit=1000"). Renaming them is OPTIONAL; if you do, it must be one
   mechanical commit that also updates every `vi.mock("@/lib/api/jolpica")`
   factory that names them — run
   `grep -rln "getSeasonResults" src/ tools/` first and touch every hit.

### Risks
- 15 test files mock `@/lib/api/jolpica` **by export name**. Phase 2 must not
  add/remove/rename exports except via the rule in step 4.
- `paginateMRData` must preserve the NaN-guard semantics exactly — they were
  added for malformed-429-page resilience.

### Definition of Done
- `npm test` green; `mrData.test.ts` + `championshipVerification.test.ts`
  passing; coverage gate passes.
- `grep -c "RaceTable.Races\[0\]" src/lib/api/jolpica.ts` → 0.
- `jolpica.ts` is under ~200 lines.
- `onboarding/05-data-fetching.md` documents `firstRaceField` /
  `paginateMRData` as the standard way to add a Jolpica fetcher.
- Commit: `refactor(api): generic MRData unwrap + pagination helpers`.

---

## Phase 3 — Shared snapshot types (LOW risk)

**Goal:** one set of types for snapshot payloads, imported by BOTH the
`tools/` writers and the routes that read them — so writer/route drift becomes
a compile error instead of a production outage.

### New files
- `src/lib/snapshots/types.ts`

### Modified files
- `tools/snapshot-daily.ts`, `tools/snapshot-weekly.ts` (+ their tests)
- `src/app/api/standings/route.ts`, `schedule/route.ts`, `results/route.ts`,
  `driver-career/route.ts`, `driver-season/route.ts`,
  `circuit-records/route.ts`, `compare/route.ts` (inline shapes ~lines 119–130)
- `onboarding/06-caching.md` (docs-as-you-go: snapshot-shape contract note)

### Step-by-step

1. Create `src/lib/snapshots/types.ts`:
   ```ts
   import type { DriverStanding, ConstructorStanding, Race } from "@/lib/types";
   import type { DriverCareerStats } from "@/lib/stats/driverCareer";

   export type SnapshotSource = "jolpica" | "live";

   export interface SnapshotMeta {
     snapshotAt: string;       // ISO timestamp the payload was produced
     source: SnapshotSource;   // "jolpica" = written by a tools/ writer
   }

   export interface StandingsSnapshot extends SnapshotMeta {
     drivers: DriverStanding[];
     constructors: ConstructorStanding[];
   }
   export interface ScheduleSnapshot extends SnapshotMeta { races: Race[] }
   export interface SeasonResultsSnapshot extends SnapshotMeta { races: Race[] }
   export interface DriverCareerSnapshot extends SnapshotMeta {
     driverId: string;
     career: DriverCareerStats;
     seasons: number[];
   }
   export interface DriverSeasonsSnapshot extends SnapshotMeta {
     driverId: string;
     seasons: number[];
   }
   ```
   (Check the actual current writer payloads field-by-field before finalizing —
   the types must describe what is already on disk in `data/snapshots/`,
   not an aspiration.)
2. **Writers:** in `tools/snapshot-daily.ts` / `snapshot-weekly.ts`, type each
   `atomicWriteJson` payload: `const payload: StandingsSnapshot = {...}`.
3. **Routes:** type each read: `readSnapshotOrFetch<StandingsSnapshot>({ ... })`
   and type the `liveFn` return the same way. Where a route builds the same
   shape inline (compare route ~119–130), replace the inline type with the
   import.
4. **Drift tripwire test:** in `tools/__tests__/snapshot-weekly.test.ts`, add a
   compile-level assertion that the written driver-career payload satisfies
   `DriverCareerSnapshot` (e.g. `const _check: DriverCareerSnapshot = payload`).
   This is the test that would have caught the June outage.

### Risks
- If a type doesn't match what's on disk, the route will surface it at compile
  time — good — but double-check `data/snapshots/*.json` on main against your
  types before assuming the writer is wrong.

### Definition of Done
- `npm test` green; `npx tsc --noEmit` error count not higher than baseline
  (currently 60 pre-existing — record the number before you start).
- No route or writer defines a snapshot payload shape inline.
- Commit: `refactor(snapshots): shared payload types for writers and routes`.

---

## Phase 4 — Client fetch helper + test infrastructure (LOW-MED risk)

**Goal:** one client-side fetch wrapper; one shared jolpica mock factory.
(No dependency on P1–P3; do any time before P6.)

### New files
- `src/lib/api/clientFetch.ts` (+ test)
- `src/test/mockJolpica.ts`

### Modified files
- The 5+ components with inline `fetch(...)` + `res.ok` + `json()` casts
  (find them: `grep -rn "await fetch(\`/api" src/components src/app`)
- The 15 test files re-mocking `@/lib/api/jolpica`
  (find them: `grep -rln 'vi.mock("@/lib/api/jolpica"' src/ tools/`)
- `onboarding/11-testing.md` (docs-as-you-go)

### Step-by-step

1. `src/lib/api/clientFetch.ts`:
   ```ts
   /** Same-origin JSON fetch for client components. Throws on !res.ok so
    *  React Query's error state engages instead of rendering bad data. */
   export async function fetchJson<T>(url: string): Promise<T> {
     const res = await fetch(url, { headers: { Accept: "application/json" } });
     if (!res.ok) throw new Error(`Request failed: ${res.status} ${url}`);
     return (await res.json()) as T;
   }
   ```
   Tests: ok response → parsed body; 404 → throws with status in message;
   malformed JSON → rejects.
2. Sweep the components: each `const res = await fetch(...); if (!res.ok) ...;
   return res.json() as T` becomes `return fetchJson<T>(url)`. **Keep each
   component's URL string and generic type identical** — existing jsdom tests
   mock `global.fetch` and assert on those URLs; they are your regression net.
3. `src/test/mockJolpica.ts` — a `vi.hoisted`-compatible factory:
   ```ts
   import { vi } from "vitest";

   /** Call inside vi.hoisted(); spread into vi.mock("@/lib/api/jolpica"). */
   export function createJolpicaMocks() {
     return {
       getSchedule: vi.fn(),
       getDriverStandings: vi.fn(),
       getConstructorStandings: vi.fn(),
       getRaceResults: vi.fn(),
       // ...one vi.fn() per export of src/lib/api/jolpica.ts — keep this list
       // in sync; a test that needs a missing export will fail loudly.
     };
   }
   ```
   Migrate the 15 files: their hoisted blocks shrink to
   `const jolpica = vi.hoisted(() => createJolpicaMocks())` +
   `vi.mock("@/lib/api/jolpica", () => jolpica)`. Per-test behavior
   (`jolpica.getSchedule.mockResolvedValue(...)`) is unchanged.

### Risks
- The mock factory must export **every** name `jolpica.ts` exports, or
  previously-passing tests fail with "X is not a function". Generate the list
  with `grep -n "^export" src/lib/api/jolpica.ts` after Phase 2 settles.
- Test count must stay at the baseline (~689 + Phase 1–3 additions) — this
  phase adds tests for `clientFetch` but must not lose any.

### Definition of Done
- `npm test` green; same-or-higher test count.
- `grep -rn "await fetch(\`/api" src/components src/app --include="*.tsx" | grep -v clientFetch` → empty (route files excluded).
- `grep -rln 'vi.mock("@/lib/api/jolpica"' src/ tools/ | xargs grep -L mockJolpica` → empty.
- `onboarding/11-testing.md` names `mockJolpica.ts` as the standard.
- Commit: `refactor(test+client): shared fetchJson + jolpica mock factory`.

---

## Phase 5 — Component extraction, wave 1: no fetching (MED risk — jsdom)

**Goal:** pull inline sub-components into their own files. Pure file moves —
identical DOM, identical props, no new behavior.

### New files (all under `src/components/`)
- `schedule/Countdown.tsx`, `schedule/SessionRow.tsx`, `schedule/ScheduleRow.tsx`
- `race/ResultTable.tsx`, `race/RaceTimesPanel.tsx`
- `drivers/sections/DriverBioSection.tsx`, `DriverQuotesSection.tsx`,
  `DriverSeasonSection.tsx`, `DriverCareerSection.tsx`, `DriverNewsSection.tsx`
- One co-located `.test.tsx` per extracted component (happy path + one edge)

### Modified files
- `src/components/schedule/ScheduleClient.tsx` (306L → ~80L)
- `src/components/race/RaceDetailClient.tsx` (293L → ~150L)
- `src/components/drivers/DriverDetailPanel.tsx` (267L → ~60L orchestrator)
- `src/components/standings/PositionBadge.tsx` → renamed (see step 4)
- `onboarding/10-components-theming.md` (docs-as-you-go)

### Step-by-step

1. **ScheduleClient:** `Countdown` (~lines 60–70), `SessionRow` (~90–150),
   `ScheduleRow` (~156–249) are already standalone functions inside the file —
   move each to its own file, export default, import back. Props stay exactly
   as they are. `Countdown`'s new test must use `vi.setSystemTime` (AGENTS.md
   forbids un-frozen `new Date()` in assertions).
2. **RaceDetailClient:** `ResultTable` (~lines 45–142, used by the race /
   qualifying / sprint tabs) → `race/ResultTable.tsx`. The timezone strip
   (~158–215) → `race/RaceTimesPanel.tsx`. Note `RaceStartTimes.tsx` already
   exists — if the inline panel duplicates it, reuse the existing component
   instead of extracting a second one (check first; don't create a third
   near-duplicate).
3. **DriverDetailPanel:** the five content sections (bio ~98–114, quotes
   ~128–155, season ~157–174, career ~176–218, news ~220–264) each become a
   file under `drivers/sections/`. The panel becomes an orchestrator that
   passes each section its slice of already-fetched data — **fetching stays in
   the panel/page for now** (moves in Phase 6).
4. **PositionBadge name collision — rename, do NOT merge.** Verified: the two
   components render entirely different DOM. `standings/PositionBadge.tsx` is
   a circular medal badge (gold/silver/bronze tokens); `compare/PositionBadge.tsx`
   renders `P{n}` text with status/fastest-lap handling. Merging them would
   change visuals. Instead: rename the standings one to
   `standings/MedalPositionBadge.tsx` (component `MedalPositionBadge`), update
   its imports/tests, and leave the compare one as-is. Add a one-line comment
   in each pointing at the other ("not interchangeable — different visual").

### Risks
- Existing jsdom tests (`ScheduleClient.test.tsx`, `RaceDetailClient.test.tsx`,
  `DriverDetailPanel.test.tsx`, `StandingsTables.test.tsx`,
  `PositionBadge.test.tsx`) assert on rendered output. If any assertion needs
  changing, the DOM changed — revert and re-extract.
- Watch for module-level constants the inline components closed over (e.g.
  formatters); move them with the component or import from `src/lib/time/format.ts` (Phase 1).

### Definition of Done
- `npm test` green; every pre-existing jsdom assertion untouched; one new
  test per extracted component.
- No component file in the touched set exceeds ~150 lines.
- `grep -rn "function ResultTable\|function Countdown\|function SessionRow\|function ScheduleRow" src/components/schedule/ScheduleClient.tsx src/components/race/RaceDetailClient.tsx` → empty.
- Commit per parent file (3–4 commits), e.g.
  `refactor(schedule): extract Countdown/SessionRow/ScheduleRow`.

---

## Phase 6 — Component extraction, wave 2: fetch-owning hooks (MED risk)

**Goal:** consolidate scattered `useQuery` calls into named hooks; extract the
remaining fetch-owning sub-components. Depends on P4 (`fetchJson`) and P5.

### New files
- `src/hooks/useDriverDetails.ts` (+ renderHook test)
- `src/hooks/useDriverComparison.ts` (+ test)
- `src/hooks/useCircuitData.ts` (+ test) — circuit info + incidents queries
- `src/components/race/IncidentDialog.tsx`, `race/CornerSelector.tsx`
- `src/components/compare/DriverCard.tsx` (if not already separate)
- `src/components/weekend/SessionResults.tsx`

### Modified files
- `src/app/drivers/page.tsx` (237L → ~120L): the 6 selected-driver queries
  (news, season, career, wikidata, photos, standings) collapse into
  `useDriverDetails(selectedDriverId, season)` returning
  `{ standings, photos, news, seasonStats, career, wikidata }` slices with
  their loading/error flags.
- `src/components/compare/DriversCompareTab.tsx` (305L → ~140L): 5 queries +
  selection state → `useDriverComparison()`.
- `src/components/race/CircuitMap.tsx` (323L → ~140L): the two queries →
  `useCircuitData(year, round)`; the incident dialog (~208–263) →
  `IncidentDialog.tsx`; the sector/corner button grid (~265–320) →
  `CornerSelector.tsx`.
- `src/components/weekend/WeekendClient.tsx` (280L → ~150L): inline
  `SessionResults` (~66–163) extracted; its internal query moves with it.
- `onboarding/10-components-theming.md` + `05-data-fetching.md` (docs-as-you-go)

### Step-by-step

1. For each hook: copy the existing `useQuery` blocks verbatim (same
   `queryKey`s, same URLs via `fetchJson`, same `enabled` guards, same
   `staleTime`s) into the hook file. The hook returns the query results in a
   named object. **Changing a queryKey is a behavior change** (cache identity)
   — don't.
2. Parent components consume the hook and pass slices to the Phase-5 section
   components. Render output must be byte-identical.
3. renderHook tests (jsdom project): wrap in a `QueryClientProvider` (see
   `src/test/render.tsx` for the existing wrapper), mock `global.fetch` per
   URL, assert each slice resolves and `enabled: false` queries don't fire
   when no driver is selected.
4. Existing component tests mock `global.fetch` at the same URLs — they must
   pass **unmodified**; that is the regression check for each extraction.

### Risks
- Highest-risk phase. Do ONE parent component per commit, full suite between.
- `enabled` guards: drivers/page gates queries on `selected` being non-null —
  preserve exactly or you'll introduce request storms (the thing the rate-limit
  work just fixed).
- React Query identity: hooks must not recreate `queryKey` arrays with unstable
  references (keep keys as literal arrays exactly as they are today).

### Definition of Done
- `npm test` green with zero modifications to pre-existing component test
  assertions; new renderHook tests passing.
- `drivers/page.tsx`, `DriversCompareTab.tsx`, `CircuitMap.tsx`,
  `WeekendClient.tsx` each under ~150 lines.
- Commits: one per parent, e.g. `refactor(drivers): useDriverDetails hook`.

---

## Phase 7 — Route-layer cleanup (MED risk)

**Goal:** make the two hard-to-read routes scannable; write down the error
policy; resolve dead ends. Depends on P3.

### New files
- `src/app/api/compare/_views.ts` (underscore = excluded from routing,
  same convention as `src/app/api/sessions/_shared.ts`)

### Modified files
- `src/app/api/compare/route.ts` (226L → ~50L dispatcher)
- `src/app/api/driver-career/route.ts`
- `src/app/api/logo/route.ts`
- `src/app/weekend/page.tsx`
- `AGENTS.md` (error-policy section)
- `onboarding/07-api-routes.md`, `02-project-structure.md`,
  `06-caching.md` (RUNBOOK link) (docs-as-you-go)

### Step-by-step

1. **Compare route — extract, do NOT split.** Both callers
   (`DriversCompareTab`, `TeamsCompareTab`) call `/api/compare?view=…`;
   splitting into three routes would change URLs, rate-limit bucket keys, and
   the route tests for zero user benefit. Instead move the three view handlers
   into `_views.ts` as `handleSeasonView(params)`, `handleTeamsView(params)`,
   `handleCircuitView(params)` returning `NextResponse`. `route.ts` keeps:
   rate limit → common validation → dispatch on `view`. The existing
   `src/app/api/__tests__/compare.test.ts` must pass unmodified.
2. **driver-career — flatten the try-inside-catch.** Current flow buries the
   fallback in a catch block. Restructure to sequential early returns:
   ```ts
   try {
     const payload = await readSnapshotOrFetch({...});   // snapshot → strict live
     return cachedJson(payload, "careerStats");
   } catch (err) {
     logRouteError("driver-career", err);
   }
   // strict path failed — best-effort, uncached
   try {
     return NextResponse.json(await computeCareerBestEffort(driverId));
   } catch (err) {
     return serverError("driver-career", err);
   }
   ```
   Same payloads, same status codes — the route test must pass unmodified.
3. **Error policy — document, don't change shapes.** Add to AGENTS.md:
   > **`gracefulDegradation` vs `serverError`:** return
   > `gracefulDegradation` (HTTP 200 + `{available:false}`) only when the
   > client renders a designed empty-state for optional enrichment —
   > currently `/api/standings`, `/api/circuit-info`, `/api/race-incidents`
   > (consumed by TelemetryPanel / CircuitMap-style empty states). Return
   > `serverError` (HTTP 500) when the data is the page's primary content and
   > the client branches on `!res.ok`. **Do not flip an existing route
   > between the two** — clients branch on the current contract; a 500→200
   > flip silently breaks their error handling.
   The only normalization allowed: `logo/route.ts`'s raw 404 →
   `notFound("unknown team")` from `routeHelpers` (byte-identical body shape —
   verify before committing).
4. **Weekend page:** `src/app/weekend/page.tsx` returns `notFound()`. Keep it
   parked (re-enabling is a product decision, not a refactor), but replace the
   stale comment with a dated one pointing at the decision record in
   `docs/architecture.md`, and fix `onboarding/02-project-structure.md` which
   still calls it "Live session view".
5. **Docs:** link `docs/RUNBOOK_SNAPSHOTS.md` from `onboarding/06-caching.md`.

### Risks
- `_views.ts` must not export a `GET`/`POST` — Next would treat it as a route
  if misnamed; the leading underscore prevents that (verify the dev server
  doesn't register it).
- The driver-career flatten changes control flow, not behavior — diff the
  route test snapshot/assertions before and after to prove it.

### Definition of Done
- `npm test` green; `compare.test.ts` and `driver-career.test.ts` unmodified.
- `src/app/api/compare/route.ts` under ~60 lines.
- AGENTS.md contains the error-policy rule.
- Commit: `refactor(api): compare view handlers + flattened driver-career flow`.

---

## Phase 8 — Legacy `DataClass` key removal (MED risk)

**Goal:** finish the half-done migration: one naming scheme for cache tiers.
Depends on P7 (so route churn is done first).

### Modified files
- `src/lib/cacheStrategy.ts` (+ `cacheStrategy.test.ts`)
- The ~48 legacy-key references (audit count; spans fetch calls, route
  `cachedJson`/`readSnapshotOrFetch` args, the `dataClass: DataClass =
  "standings"` **default parameter** in `jolpicaFetch`, and tests). Find the
  fetch-context subset with:
  `grep -rn '"standings"\|"schedule"\|"telemetry"\|"news"\|"results"\|"projections"\|"form"' src/ --include="*.ts" | grep -i "dataclass\|jolpicaFetch\|openF1Fetch\|adaptiveRevalidate\|readSnapshotOrFetch\|cachedJson"`
  then sweep tests and the default param separately — the compiler (step 3)
  is the final catch-all.
- `onboarding/06-caching.md` (docs-as-you-go: delete the legacy-keys section)

### Step-by-step — TTL-PRESERVING renames only

1. **Why not just remap to existing tier keys:** legacy keys are NOT
   TTL-equivalent — e.g. legacy `results` = 1H base / 2M race-weekend, but
   tier key `liveResults` = 5M / 1M. Remapping would silently change cache
   behavior. Instead, for each legacy key, add a tier-styled name with the
   **identical TTL row** copied over:

   | Legacy key | New name | TTL rows |
   |---|---|---|
   | `standings` | `liveStandings` (already exists, identical 5M/1M) — reuse | unchanged |
   | `results` | `historicalResults` (NEW) | copy 1H/2M |
   | `schedule` | `seasonSchedule` — **check**: existing rows are 24H/6H vs legacy 1H/1H → NOT equivalent → add `raceSchedule` (NEW) with 1H/1H | copy |
   | `telemetry` | `sessionTelemetry` (NEW) | copy 1M/30S |
   | `news` | `newsFeed` (NEW) | copy 15M/5M |
   | `projections` | `projectionSnapshot` — **check** rows match (24H/24H vs 7D/7D?) → if not, add `projectionCompute` (NEW) | copy |
   | `form` | `recentForm` (NEW) | copy 5M/1M |

   For every row marked **check**: open `cacheStrategy.ts`, compare BASE and
   RACE_WEEKEND values; only reuse an existing tier key when BOTH rows are
   identical. When in doubt, add a new key with copied values — keys are
   cheap, silent TTL changes are not.
2. Mechanical sweep of the 48 call sites, one upstream module at a time
   (jolpica → openf1 → routes), full suite between commits.
3. Delete the legacy keys from the `DataClass` union + both TTL tables; the
   compiler now finds any site you missed.
4. Update `cacheStrategy.test.ts` (it asserts TTLs per key — the new keys
   assert the same numbers).

### Risks
- `cacheKeySuffix(dataClass)` embeds the key string in `unstable_cache` keys →
  every renamed key's cache rows go cold once on deploy. Acceptable (snapshot
  cold tier absorbs it), but **deploy this phase off a race weekend**.
- This phase touches many files shallowly — keep it to renames ONLY; resist
  bundling any other cleanup into these commits.

### Definition of Done
- `npm test` green; `grep -rn 'DataClass = "standings"' src/` and the legacy
  union members are gone; `npx tsc --noEmit` error count ≤ baseline.
- `onboarding/06-caching.md` shows only the new key table.
- Commit: `refactor(cache): retire legacy DataClass keys (TTL-preserving)`.

---

## Phase 9 — Onboarding documentation sweep (LOW risk)

**Goal:** the 13-chapter `onboarding/` guide describes the refactored codebase
accurately end-to-end. Phases 1–8 already updated their own chapters
(docs-as-you-go); this phase is the consistency pass.

### Modified files
- `onboarding/02-project-structure.md` — full tree refresh: `src/lib/time/`,
  `src/lib/api/{mrData,clientFetch,championshipVerification,jolpicaLimits}.ts`,
  `src/lib/snapshots/types.ts`, `src/hooks/useDriverDetails.ts` etc.,
  `src/components/drivers/sections/`, `MedalPositionBadge`.
- `onboarding/05-data-fetching.md` — `fetchJson` is THE client fetch;
  `firstRaceField`/`paginateMRData` are THE Jolpica fetcher pattern.
- `onboarding/06-caching.md` — new DataClass table only; RUNBOOK link present.
- `onboarding/07-api-routes.md` — compare `_views.ts` dispatcher; the
  AGENTS.md error-policy rule mirrored verbatim.
- `onboarding/10-components-theming.md` — extraction conventions: sections in
  `<feature>/sections/`, hooks in `src/hooks/`, when a sub-component earns its
  own file (>40 lines or reused).
- `onboarding/11-testing.md` — `mockJolpica.ts` factory, renderHook pattern,
  `vi.setSystemTime` rule.
- `onboarding/13-recipes.md` — **walk every recipe** and re-validate the code
  blocks against the new structure (recipes are copy-paste sources for new
  engineers; one stale import path actively misleads). Update imports, file
  paths, and the "add a new API route" / "add a new fetcher" / "add a chart"
  recipes to use the new helpers.
- `onboarding/diagrams/mermaid/data-fetching-stack.md` +
  `caching-decision.md` (and their `puml/` twins) — these name files and
  DataClass keys; regenerate to match.

### Step-by-step
1. `grep -rn "src/lib\|src/components\|src/hooks" onboarding/ | grep -v diagrams`
   → verify every referenced path exists (`ls` each unique hit).
2. `grep -rn "standings\"\|results\"" onboarding/06-caching.md` → no legacy keys.
3. Read `13-recipes.md` top to bottom; for each fenced code block, confirm the
   imports resolve in the current tree (spot-compile a representative one in a
   scratch file if unsure, then delete the scratch).
4. Update both diagram formats (mermaid + puml) — they must stay twins per
   `onboarding/diagrams/README.md`.

### Definition of Done
- Path-existence grep from step 1 has zero dead references.
- A new engineer following recipe 1 ("add an API route") end-to-end on a
  scratch branch produces a compiling route — actually do this once.
- Commit: `docs(onboarding): sync guide with DRY refactor`.

---

## Final verification (before opening a PR)

1. `npm run lint` — no new errors.
2. `npm test` — green, test count ≥ baseline 689 + all phase additions.
3. `npm run test:ci` — coverage gate passes (new `src/lib` helpers raised it).
4. `npm run build` — passes.
5. `npx tsc --noEmit 2>&1 | grep -c "error TS"` — ≤ the baseline count you
   recorded in Phase 3 (60 at time of writing).
6. Manual browser pass (dark + light, mobile + desktop): schedule page
   countdown ticks; race detail tabs render; drivers page selection loads all
   panels; compare both tabs; standings medals look identical to production.
7. File-size spot check:
   `find src -name "*.tsx" -not -path "*__tests__*" | xargs wc -l | sort -rn | head -8`
   — nothing over ~200 except `drivers-static.ts` (data file, exempt).

## Risks & unknowns — verify during work, do not assume

| # | Risk | Mitigation |
|---|---|---|
| 1 | jsdom tests are the behavior contract — an assertion change means you broke something | Revert and re-extract; never "fix the test" in waves 1–2 |
| 2 | 15 test files mock jolpica by export name | Phase 4's factory + Phase 2's name-stability rule |
| 3 | DataClass renames silently changing TTLs | TTL-preserving table in Phase 8; compare BASE + RACE_WEEKEND rows before reusing any existing key |
| 4 | Route error-shape flips breaking clients | Phase 7 policy: document, don't change; only byte-identical normalizations |
| 5 | queryKey changes breaking React Query cache identity | Copy keys verbatim into hooks; never rebuild them |
| 6 | Snapshot types not matching what's on disk | Check `data/snapshots/*.json` on main before finalizing types |
| 7 | Stale recipes misleading future engineers | Phase 9 step 3: validate every code block; do the recipe-1 dry run |

## Out of scope (do not do in this refactor)

- Re-enabling the weekend route (product decision).
- Splitting `/api/compare` into separate routes (verified: net negative).
- Merging the two PositionBadges (verified: different visuals by design).
- Any TTL tuning, feature work, or visual polish.
- Rewriting `createApiFetcher`/`retry`/`concurrencyLimiter` (already solid).
