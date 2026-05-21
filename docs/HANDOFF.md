# F1 Dashboard — Engineering Handoff: Six New Features

> **Read this first, then work strictly top-to-bottom.** This document is self-contained:
> every workstream has exact file paths, function signatures, step-by-step instructions,
> the tests to write, and a "Definition of Done" you can verify yourself. Do not start a
> workstream until the previous one's DoD is green.

---

## 0. Orientation

### 0.1 What you are building

Six UX features for the live F1 dashboard (https://f1-dashboard-lilac.vercel.app):

| WS | Feature | Page |
|---|---|---|
| WS-1 | A "Past Races / Upcoming Races" divider | `/schedule` |
| WS-2 | Crash/incident markers on the circuit map | `/race/[year]/[round]` Circuit tab |
| WS-3 | Click a driver → modal with that driver's season race-by-race stats | `/standings` |
| WS-4 | Richer constructor comparison (past seasons, championship context) | `/compare` |
| WS-5 | Driver headshot photos on the driver cards | `/drivers` |
| WS-6 | Expanded driver stats — current season + career totals | `/drivers` |

### 0.2 The stack

Next.js 16 (App Router, **modified** — see 0.6), React 19, TypeScript, Tailwind v4,
React Query v5, Vitest 2.x, `@base-ui/react` for UI primitives. Data comes from three
free APIs, always proxied through our own `/api/*` routes: **Jolpica/Ergast** (results,
standings, schedule), **OpenF1** (live timing, telemetry, 2023+ only), **OpenMeteo**
(weather). No database, no auth, free-tier only.

### 0.3 Branch & setup

```bash
git fetch origin
git checkout -b feature/six-features origin/main   # always branch from origin/main
npm install
npm test          # confirm a green baseline before you touch anything
```

Work on your feature branch. Commit per workstream (or a short series). Never push a red
test suite.

### 0.4 Build order — DO NOT REORDER

`WS-3 → WS-1 → WS-4 → WS-5 → WS-6 → WS-2`

Why: **WS-3 creates three shared assets** (`dialog.tsx`, `driverSeason.ts`,
`DriverSeasonStats.tsx`) that **WS-6 reuses** — build WS-3 first. WS-5 and WS-6 both edit
`src/app/drivers/page.tsx`; do WS-5 then WS-6 so you only touch that file in a clean
sequence. WS-1, WS-4, WS-2 are independent and could be done by a second engineer in
parallel, but the order above is the safe default.

### 0.5 Non-negotiable conventions

1. **TDD.** Write the test first or alongside the code. `npm test` must exit 0 before
   every commit. Every new function gets one positive test and one edge/failure test.
   Never use `--no-verify`, never comment out a failing test, never lower the coverage
   gate.
2. **No hardcoded colors in JSX/TSX.** Use design tokens only (Tailwind classes like
   `bg-surface-2`, `text-muted-foreground`, or `var(--…)`). Raw hex is allowed *only* in
   `src/app/globals.css` and chart-theme files. Note: `CircuitMap.tsx` already contains
   hex literals in its `SECTORS` array — that is pre-existing debt; **do not copy that
   pattern**, and do not "fix" it as part of this work.
3. **Every new API route**, in this order: call `rateLimited(req, "<route-name>")` from
   `src/lib/api/withRateLimit.ts` **first**; validate every query param with a pattern
   from `src/lib/validators.ts`; then add a `describe` block to
   `src/app/api/__tests__/validation.test.ts`.
4. **Test environment.** Node tests for anything in `src/lib/` and `src/app/api/`
   (pure logic). jsdom tests for components (file name ends `.test.tsx`). Mock external
   data at the `fetch` / React Query boundary — never make a real network call in a test.
5. **Coverage gate.** `vitest.config.ts` enforces ≥80% lines/functions/statements and
   ≥75% branches over `src/lib/**/*.ts`. Every new file in `src/lib/stats/` must have
   thorough tests. `src/lib/api/jolpica.ts` and `openf1.ts` are coverage-excluded — the
   thin HTTP fetchers you add there do not need direct unit tests, but any **pure shaper
   function** you add must be tested.

### 0.6 "Modified Next.js"

This repo runs a customized Next.js 16. Before using any framework API you are unsure
about, read the matching guide in `node_modules/next/dist/docs/`. Likewise, before
writing the Dialog wrapper, open `node_modules/@base-ui/react/dialog/index.parts.d.ts`
to confirm exact part names and props — do not assume an API from memory.

### 0.7 Reference patterns to copy (study these before starting)

| You are building | Copy the pattern from |
|---|---|
| A pure stats helper | `src/lib/stats/constructorH2H.ts` (+ its test) |
| A UI primitive wrapping Base UI | `src/components/ui/select.tsx`, `tabs.tsx` |
| A new API route | `src/app/api/compare/route.ts` |
| A route's validation test | `src/app/api/__tests__/validation.test.ts` (`/api/team-radio` block) |
| A lazy, on-select React Query fetch in a component | the `driver-news` query in `src/app/drivers/page.tsx` |
| Session resolution from a Jolpica race | `src/app/api/team-radio/route.ts` (uses `pickRaceSession`) |

---

## WS-3 — Standings driver modal

**Goal:** clicking a driver row on `/standings` opens a responsive modal showing that
driver's race-by-race results for the season plus season totals. Closes on backdrop tap,
Escape, and a close button. Works on mobile.

### Step 3.1 — Create the Dialog primitive

**New file:** `src/components/ui/dialog.tsx`

Wrap `@base-ui/react/dialog`. First read `node_modules/@base-ui/react/dialog/index.parts.d.ts`
for exact part names. Follow the structure of `src/components/ui/select.tsx`: thin
functional components, a `data-slot` attribute on each, `cn()` for class merging,
**token-only** styling.

Export: `Dialog` (= Base UI `Root`), `DialogTrigger`, `DialogPortal`, `DialogBackdrop`,
`DialogPopup`, `DialogTitle`, `DialogDescription`, `DialogClose`.

- `DialogBackdrop`: `fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm`.
- `DialogPopup`: `fixed z-[201]`; on mobile a full-width bottom-or-center sheet
  (`inset-x-2 bottom-2` or centered with `max-h-[85vh] overflow-y-auto`), at `sm:` a
  centered card (`sm:max-w-lg sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2`).
  Use `bg-surface-2 border border-border rounded-xl`.
- Base UI gives you focus trap, Escape-to-close, backdrop click-to-close, and portal for
  free — do not re-implement those.

**Test (jsdom):** `src/components/ui/__tests__/dialog.test.tsx` — renders a `Dialog`
with a trigger; clicking the trigger shows the title/children; clicking `DialogClose`
hides it; pressing Escape hides it.

### Step 3.2 — Create the season-stats helper

**New file:** `src/lib/stats/driverSeason.ts` — pure, no I/O. Copy the defensive style
of `constructorH2H.ts` (guard non-array input, exported interfaces).

```ts
export interface DriverSeasonRaceRow {
  round: string;
  raceName: string;
  circuitName: string;
  grid: number | null;
  finish: number | null;     // null when not classified / DNF
  points: number;
  status: string;
  hasFastestLap: boolean;
}
export interface DriverSeasonAggregates {
  starts: number; wins: number; podiums: number;
  fastestLaps: number; points: number; finishes: number;
  dnfs: number; avgFinish: number;   // average over classified finishes; 0 if none
}
export interface DriverSeasonSummary {
  driverId: string;
  rows: DriverSeasonRaceRow[];
  aggregates: DriverSeasonAggregates;
}
export function driverSeasonSummary(races: Race[], driverId: string): DriverSeasonSummary;
```

Implementation notes:
- Iterate `races`; for each race find the `Results[]` entry whose `Driver.driverId`
  matches. Skip races where the driver did not appear.
- `finish`: parse `result.position`; treat a non-numeric/`"R"` position as `null`.
- DNF detection: **reuse the exact predicate already in `constructorH2H.ts`** (a status
  that does not start with `"Finished"` and is not `"+1 Lap"` / `"+N Laps"`). Import or
  copy it — do not invent a new rule.
- `hasFastestLap`: `result.FastestLap?.rank === "1"`.
- `wins` = finish 1; `podiums` = finish 1–3; `avgFinish` = mean of non-null `finish`
  values (return `0`, not `NaN`, when there are none).

**Test (node):** `src/lib/stats/__tests__/driverSeason.test.ts`. Build mock `Race[]`
with a `mkRace` helper — copy the helper style from `constructorH2H.test.ts`. Cover:
happy path (multiple races, wins/podiums/fastest-laps counted, `avgFinish` correct);
driver absent from every race (empty `rows`, all-zero aggregates); DNF rows (`finish`
null, counted in `dnfs` not `finishes`); a fastest-lap with `rank:"1"` vs `rank:"2"`;
non-array input guard; a race with empty `Results`.

### Step 3.3 — Create the presentational stats component

**New file:** `src/components/stats/DriverSeasonStats.tsx` — **presentational only**, no
data fetching. Props: a `DriverSeasonSummary` (or its `rows` + `aggregates`).

Render two parts: (a) an aggregates strip — reuse the visual `StatBox` pattern that
already exists in `src/app/drivers/page.tsx`; (b) a per-race table using
`Table/TableHeader/TableBody/TableRow/TableCell` from `src/components/ui/table.tsx`,
columns: Round, Race, Grid, Finish, Pts, Status (mark fastest-lap rows with a small
badge). Wrap the table in `overflow-x-auto -mx-4 px-4` for mobile, like
`StandingsTables.tsx` does. Token-only colors.

### Step 3.4 — Create the API route

**New file:** `src/app/api/driver-season/route.ts`. Copy the shape of
`src/app/api/compare/route.ts`.

```
GET /api/driver-season?season=<season>&driverId=<id>
```

1. `const blocked = rateLimited(req, "driver-season"); if (blocked) return blocked;`
2. Read `season` (default `"current"`) and `driverId`. Validate `season` with
   `VALID_SEASON` and `driverId` with `VALID_ID` from `src/lib/validators.ts`; return
   `400` on failure.
3. `const races = await getSeasonRaceResults(season)` (from `src/lib/api/jolpica.ts` —
   already exists).
4. `const summary = driverSeasonSummary(races, driverId);`
5. Return `NextResponse.json({ season, driverId, summary })`.
6. `export const revalidate = 300;`. Wrap the body in try/catch → log + `500`.

### Step 3.5 — Wire up the standings table

**Modify:** `src/components/standings/StandingsTables.tsx`.

- Add `const [selected, setSelected] = useState<DriverStanding | null>(null);`
- Make each driver `<TableRow>` clickable: `onClick={() => setSelected(row)}`,
  `className` gains `cursor-pointer`, and for accessibility add `role="button"`,
  `tabIndex={0}`, and `onKeyDown` that triggers on Enter/Space. The constructor table
  rows are unchanged.
- Render a `Dialog` controlled by `selected` (`open={!!selected}`,
  `onOpenChange={(o) => !o && setSelected(null)}`).
- Inside the dialog, fetch lazily:
  ```ts
  useQuery({
    queryKey: ["driver-season", season, selected?.Driver.driverId],
    queryFn: () => fetch(`/api/driver-season?season=${season}&driverId=${selected!.Driver.driverId}`).then(r => r.json()),
    enabled: !!selected,
  })
  ```
- Body: `<DriverSeasonStats summary={data.summary} />`; show `Skeleton` while loading and
  a plain "Couldn't load this driver's season." message on error.
- `StandingsTables` already receives a `season` prop — reuse it; do not refetch standings.

### Step 3.6 — Tests & DoD

- Extend `src/app/api/__tests__/validation.test.ts` with a `describe("/api/driver-season
  param validation")` block asserting `VALID_SEASON` + `VALID_ID` accept good values and
  reject injection/empty (mirror the existing `/api/team-radio` block).
- **DoD:** `npm test` green; `npm run build` passes; on `/standings` clicking a driver
  opens the modal with a correct race-by-race breakdown; Escape, backdrop tap, and the
  close button all dismiss it; on a narrow viewport the modal is usable (full-width
  sheet). Commit.

---

## WS-1 — Schedule past/upcoming divider

**Goal:** on `/schedule`, show a "Past Races" heading above completed races and an
"Upcoming Races" heading (with a horizontal divider) above future races.

### Step 1.1 — Modify the schedule list

**Modify only:** `src/components/schedule/ScheduleClient.tsx`.

Races arrive already chronologically sorted. In the default-export component:

1. Compute the split index — the index of the first race that is **not** past:
   ```ts
   const splitIndex = races.findIndex((r) => !isPast(parseISO(r.date)));
   ```
   `isPast` and `parseISO` are already imported from `date-fns` in this file.
   `splitIndex === -1` means all races are past; `splitIndex === 0` means all upcoming.
2. In the `races.map(...)`, render section headings and the divider inline:
   - Before the first row, if there is at least one past race, render a "Past Races"
     heading.
   - At the row whose index === `splitIndex` (and `splitIndex > 0`), render, before that
     row, a `<Separator />` (import from `src/components/ui/separator.tsx`) followed by an
     "Upcoming Races" heading.
   - If `splitIndex === 0`, render only the "Upcoming Races" heading, no divider.
3. Heading style — tokens only: `text-xs uppercase tracking-wider text-muted-foreground
   font-semibold mt-4 mb-1` (first heading: no `mt-4`). Give the divider/heading
   fragments stable React keys (e.g. `key="section-upcoming"`).

### Step 1.2 — Tests & DoD

**New test (jsdom):** `src/components/schedule/__tests__/ScheduleClient.test.tsx`.
Pass a hand-built `races` array. Use clearly-past dates (`"2020-03-15"`) and clearly-future
dates (`"2099-03-15"`) so the test is deterministic against the real `date-fns` clock.
Cases: (a) mixed — both headings present, exactly one `Separator`, divider sits between
the last past and first upcoming row; (b) all past — "Past Races" present, "Upcoming
Races" absent, no `Separator`; (c) all upcoming — "Upcoming Races" present, "Past Races"
absent.

**DoD:** `npm test` green; `npm run build` passes; `/schedule` shows the divider and both
headings correctly mid-season, and degrades correctly at the start and end of a season.
Commit.

---

## WS-4 — Compare: richer constructor context

**Goal:** the Constructors tab on `/compare` lets the user pick a season (not just the
current one) and shows extra context — each team's championship position that season,
season wins, and best race finish — alongside the existing head-to-head.

### Step 4.1 — Inspect what already exists

Read `src/lib/stats/constructorH2H.ts` fully. `constructorHeadToHead()` already returns,
per constructor: `totalPoints, wins, podiums, oneTwos, dnfs, racesEntered, avgBestFinish`.
The only genuinely new derived values you need are **best finish** (minimum classified
position across the season) and **championship position** (from standings).

### Step 4.2 — Extend the compare route

**Modify:** `src/app/api/compare/route.ts`. The `view=teams` branch already accepts and
validates a `season` param (`VALID_SEASON`). Add to that branch:

1. After computing the head-to-head, also call `getConstructorStandings(season)` (from
   `jolpica.ts`).
2. For each of the two constructors, find its `ConstructorStanding` and pull `position`
   (championship position) and `wins`.
3. Compute best finish per constructor — the minimum numeric `position` across that
   season's race results for the constructor's cars. If you add a pure helper for this,
   put it in `src/lib/stats/constructorSeasonContext.ts` with a node test; if it is a
   one-line `Math.min`, inline it.
4. Attach this as a `context` field on the JSON response (do not break the existing
   `stats` shape).

"Notable achievements" = **only** these derivable facts (championship position, season
wins, best finish). Do not add a freeform/curated achievements source.

### Step 4.3 — Update the compare page UI

**Modify:** `src/app/compare/page.tsx`, Constructors tab.

- Add a season selector. Reuse `src/components/ui/SeasonPicker.tsx` if its API fits a
  controlled value here; otherwise use the raw `Select` primitive already used elsewhere
  on this page.
- Thread the chosen season into the teams-compare fetch (append `&season=${season}` to
  the request URL) **and into the React Query `queryKey`** so the data refetches when the
  season changes.
- Render the new `context` (championship position, season wins, best finish, races
  entered) in token-styled stat cards — reuse the existing `StatBar` / stat-card visuals
  already on the page. Do not introduce new color literals.

### Step 4.4 — Tests & DoD

- If you created `constructorSeasonContext.ts`, test it (node): best-finish = min
  position; races-entered count; empty-season guard; constructor absent from the season.
- In `src/app/api/__tests__/validation.test.ts`, add an assertion that the `teams` view
  honors a 4-digit `season` (the validators already cover it; make the intent explicit).
- **DoD:** `npm test` green; `npm run build` passes; on `/compare` Constructors tab,
  picking two teams and a past season (e.g. 2023) updates the head-to-head and shows the
  new context; `GET /api/compare?view=teams&constructorA=ferrari&constructorB=mercedes&season=2023`
  returns the `context` data. Commit.

---

## WS-5 — Drivers page: driver photos

**Goal:** each card on `/drivers` shows the driver's current-season headshot instead of
the small team logo; cards may grow slightly for clarity; if no headshot is found, fall
back to the existing team logo.

### Step 5.1 — Create the OpenF1↔Jolpica mapping helper

**New file:** `src/lib/stats/driverMapping.ts` — pure.

```ts
export function matchOpenF1Driver(
  openF1Drivers: OpenF1Driver[],
  jolpica: { driverId: string; code: string; familyName: string },
): OpenF1Driver | null;
```

Match priority: (1) OpenF1 `name_acronym` equals Jolpica `code`, case-insensitive;
(2) fallback — OpenF1 `last_name` equals Jolpica `familyName`, case-insensitive and
trimmed; (3) otherwise return `null`.

**Test (node):** `src/lib/stats/__tests__/driverMapping.test.ts` — acronym match
(case-insensitive); family-name fallback when acronym differs; no-match → `null`; empty
OpenF1 array → `null`; two drivers, picks the right one.

### Step 5.2 — Create the driver-photos route

**New file:** `src/app/api/driver-photos/route.ts`.

```
GET /api/driver-photos
```

1. `rateLimited(req, "driver-photos")` first.
2. Resolve the latest session and call `getDriversForSession("latest")` (from
   `openf1.ts` — `getDriversForSession` already accepts `"latest"`).
3. Return a slim array: `{ photos: [{ driver_number, name_acronym, last_name,
   headshot_url }] }`.
4. `export const revalidate = 86400;` (headshots change ~once per season). try/catch →
   `500`; if OpenF1 fails, return `{ photos: [] }` so the page degrades gracefully.

This route takes no user params, so its `validation.test.ts` block just documents that.

### Step 5.3 — VERIFY THE HEADSHOT HOST (do not skip)

`next.config.ts` already allows `https://media.formula1.com` in **both** the CSP
`img-src` directive and `images.remotePatterns`. OpenF1's `headshot_url` host is **not
guaranteed** to be that host.

**Action:** run the dev server, hit `http://localhost:3000/api/driver-photos`, and read a
real `headshot_url`. If its host is `media.formula1.com`, no config change is needed. If
it is anything else (e.g. `www.formula1.com`), add that host to **both** the CSP
`img-src` line and `images.remotePatterns` in `next.config.ts`. If you skip this, images
will silently fail to load with a console CSP error.

### Step 5.4 — Update the driver cards

**Modify:** `src/app/drivers/page.tsx`.

- Add `const { data: photos } = useQuery({ queryKey: ["driver-photos"], queryFn: ... })`.
- For each driver card, run `matchOpenF1Driver(photos, { driverId, code, familyName })`.
  If a match with a non-empty `headshot_url` exists, render it with `next/image` (fixed
  `width`/`height`, descriptive `alt`, e.g. `"Max Verstappen"`). Otherwise render the
  existing `TeamLogo` as the fallback.
- Increase card size modestly so the headshot reads clearly; update the matching
  `Skeleton` height in `src/app/drivers/loading.tsx` (and any inline skeleton) so loading
  and loaded states are the same size.

### Step 5.5 — Tests & DoD

- `driverMapping.test.ts` as in 5.1.
- Add a `/api/driver-photos` block to `validation.test.ts`.
- Optional jsdom test: a card whose driver has no OpenF1 match renders `TeamLogo`.
- **DoD:** `npm test` green; `npm run build` passes; `/drivers` shows headshots with no
  CSP console errors; a driver with no match still renders a team logo. Commit.

---

## WS-6 — Drivers page: expanded card stats (season + career)

**Goal:** selecting a driver card shows that driver's wins, podiums, race starts, and
fastest laps for **both** the current season and their full career.

> Depends on WS-3 (`driverSeason.ts`, `DriverSeasonStats`). Edits the same
> `src/app/drivers/page.tsx` as WS-5 — do WS-5 first.

### Step 6.1 — Add career-count fetchers to Jolpica

**Modify:** `src/lib/api/jolpica.ts`. Ergast/Jolpica supports lightweight count queries —
request `limit=1` and read `MRData.total` (a string count of all matching results).

Add (using the existing `jolpicaFetch` helper):
- `getDriverCareerWins(driverId)` → path `drivers/{id}/results/1` → `MRData.total`.
- For podiums, also fetch `drivers/{id}/results/2` and `drivers/{id}/results/3`;
  career podiums = wins + p2 count + p3 count.
- `getDriverCareerStarts(driverId)` → `drivers/{id}/results` → `MRData.total`.
- `getDriverCareerFastestLaps(driverId)` → `drivers/{id}/fastest/1/results` → `MRData.total`.
- `getDriverCareerChampionships(driverId)` → `drivers/{id}/driverStandings/1` → count of
  `StandingsLists` entries (or `MRData.total`).

> **Verify before relying on these:** run each path against the live Jolpica base URL
> once (e.g. in a browser) and confirm the JSON shape — especially `/fastest/1/results`
> and `/results/{position}` — matches what you expect. If a path differs, adjust.

### Step 6.2 — Create the career shaper + route

**New file:** `src/lib/stats/driverCareer.ts` — a **pure** function that turns the raw
string totals into a typed object. This is the part that is unit-tested (the fetchers in
`jolpica.ts` are coverage-excluded).

```ts
export interface DriverCareerStats {
  wins: number; podiums: number; starts: number;
  fastestLaps: number; championships: number;
}
export function buildDriverCareerStats(raw: {
  wins?: string; p2?: string; p3?: string;
  starts?: string; fastestLaps?: string; championships?: string;
}): DriverCareerStats;
```

Parse each string with `Number(...)`; a missing or non-numeric value becomes `0`;
`podiums = wins + p2 + p3`.

**New file:** `src/app/api/driver-career/route.ts`.

```
GET /api/driver-career?driverId=<id>
```

1. `rateLimited(req, "driver-career")` first.
2. Validate `driverId` with `VALID_ID`.
3. Fire the ~5 fetchers with `Promise.allSettled` so one failure does not sink the rest.
4. Feed the resolved values into `buildDriverCareerStats(...)`.
5. Return `{ driverId, career }`. `export const revalidate = 86400;`. try/catch → `500`.

### Step 6.3 — Extend the driver detail panel

**Modify:** `src/app/drivers/page.tsx` — the `DriverDetailPanel` component. **Extend it,
do not rebuild it.**

When a driver is selected, fire two lazy React Query calls (both `enabled: !!selected`,
the same lazy pattern as the existing `driver-news` query):

1. `["driver-season", "current", driverId]` → `GET /api/driver-season` (the WS-3 route)
   → render `<DriverSeasonStats summary={...} />` for the current-season block.
2. `["driver-career", driverId]` → `GET /api/driver-career` → render a career block
   using the existing `StatBox` component already in this file (Wins / Podiums / Starts /
   Fastest Laps / Championships).

Each block gets its own `Skeleton` while loading and degrades independently (if career
fails, the season block still shows, and vice versa).

### Step 6.4 — Tests & DoD

- `src/lib/stats/__tests__/driverCareer.test.ts` (node): happy path (string totals →
  numbers, `podiums` = sum); missing fields → `0`; non-numeric `total` → `0`.
- Add a `/api/driver-career` `VALID_ID` block to `validation.test.ts`.
- **DoD:** `npm test` green; `npm run build` passes; selecting a card on `/drivers` shows
  season + career stat blocks; both load lazily (verify in the Network tab that
  `/api/driver-season` and `/api/driver-career` fire only on selection, not on page
  load). Commit.

---

## WS-2 — Crash/incident markers on the circuit map

**Goal:** on the Circuit tab of a race page, overlay clickable markers at the on-track
location of each crash/incident; clicking a marker shows lap, driver, flag, and message.

> This is the largest and riskiest workstream. The hardest part is **coordinate
> alignment** (Step 2.4). Do not skip the calibration step.

### Step 2.1 — Add the OpenF1 location fetcher

**Modify:** `src/lib/api/openf1.ts`. The OpenF1 `/location` endpoint is **extremely
high-volume** (many samples per second per driver) — you must never fetch a whole
session.

```ts
export async function getLocations(
  sessionKey: number,
  driverNumber: number,
  dateFrom: string,   // ISO timestamp
  dateTo: string,     // ISO timestamp
): Promise<OpenF1Location[]>
```

Build the request path with `session_key`, `driver_number`, and the date-range filters
`date>=<dateFrom>` and `date<=<dateTo>` (OpenF1 supports comparison operators on
`date`). `OpenF1Location` is already defined in `src/lib/types/openf1.ts`. Always query a
**narrow window** — see Step 2.3.

### Step 2.2 — Create the incident helpers

**New file:** `src/lib/stats/incidents.ts` — pure functions:

- `classifyIncidents(raceControl: OpenF1RaceControl[]): OpenF1RaceControl[]` — keep only
  entries that represent a crash/incident: categories indicating accidents, safety car,
  virtual safety car, or yellow/red flags, **and** that have a `driver_number` (needed to
  look up location). Drop routine messages (DRS enabled, track clear, etc.).
  > Tune the keep-list against a **real 2023+ `race_control` payload** — fetch one via
  > `GET /api/sessions?endpoint=race_control&session_key=<key>` in the dev server and
  > inspect the actual `category`/`flag` strings before finalizing.
- `closestByTime(samples: OpenF1Location[], targetIso: string): OpenF1Location | null` —
  return the sample whose `date` is nearest to `targetIso`; `null` for an empty array.
- `nearestPolylinePoint(xs: number[], ys: number[], px: number, py: number): {x,y}` —
  return the polyline vertex closest to `(px, py)`. Used to snap a marker onto the track.
- `parseCornerNumber(message: string): number | null` — extract `N` from a `"Turn N"`
  substring; `null` when absent. This powers the fallback in Step 2.4.

**Test (node):** `src/lib/stats/__tests__/incidents.test.ts` — `classifyIncidents` keeps
a crash/flag entry and drops a routine one; `closestByTime` picks the nearest sample and
handles an empty array; `nearestPolylinePoint` returns the known nearest vertex for a
simple square polyline; `parseCornerNumber` handles `"Turn 4"` → `4`, `"… Turn 13 …"` →
`13`, and a no-turn message → `null`.

### Step 2.3 — Create the race-incidents route

**New file:** `src/app/api/race-incidents/route.ts`.

```
GET /api/race-incidents?year=<year>&round=<round>
```

1. `rateLimited(req, "race-incidents")` first.
2. Validate `year` with `VALID_YEAR`, `round` with `VALID_ROUND`.
3. Resolve the session exactly like `src/app/api/team-radio/route.ts`: `getSchedule(year)`
   → find the round → `getSessions(...)` → `pickRaceSession(sessions, country)`. If it
   resolves to `null`, return `{ available: false, reason: "OpenF1 covers 2023+ only" }`.
4. `getRaceControl(sessionKey)` → `classifyIncidents(...)`.
5. For each kept incident: call `getLocations(sessionKey, incident.driver_number,
   incidentDate − 4s, incidentDate + 4s)`, then `closestByTime(samples, incident.date)`
   to get `{x, y}`. Use `Promise.allSettled` over the incidents so one failed lookup
   does not sink the response.
6. Return `{ available: true, incidents: [{ x, y, lap_number, driver_number, flag,
   category, message }] }`. `export const revalidate = 300;`. try/catch → `500`.

### Step 2.4 — Coordinate alignment (the hard part — follow exactly)

OpenF1 `/location` `x,y` and the Multiviewer track polyline used by `CircuitMap.tsx` are
**believed** to share a coordinate space, but this is not guaranteed. Do all four steps:

1. **Reuse `CircuitMap`'s transform — do not re-implement it.** Open
   `src/components/race/CircuitMap.tsx`. Its `TrackSVG` does: flip y (`svgY = -y`),
   compute the center `(cx, cy)`, compute `rotationDeg = -data.rotation`, then
   `rotatePoint(x, svgY, cx, cy, rotationDeg)`, then a `viewBox` from the bounds + 7%
   padding. Refactor so this pipeline is the single source of truth, and add an optional
   prop `markers?: { x: number; y: number; meta: IncidentMeta }[]` where `x,y` are in
   **raw Multiviewer/track coordinate space** (pre-transform). Inside `TrackSVG`,
   transform each marker with the **same** `rotatePoint(marker.x, -marker.y, cx, cy,
   rotationDeg)` call the corner markers already use. Identical transform = guaranteed
   alignment between markers and track.
2. **Snap to the track.** Before transforming, pass each incident's `(x,y)` through
   `nearestPolylinePoint(trackXs, trackYs, x, y)` so the marker sits on the drawn track
   line (OpenF1 samples sit on the racing line, slightly off the centerline).
3. **Calibrate — MANDATORY before you ship.** Pick a known 2023+ race with a
   well-documented crash at a named corner. Load its Circuit tab, overlay the markers,
   and visually check each marker is at the right corner. Outcomes: aligned → ship as-is;
   a consistent offset/scale → derive and apply a one-time affine correction; grossly
   wrong → use the fallback below.
4. **Documented fallback.** If calibration fails, place markers without OpenF1 location:
   `parseCornerNumber(incident.message)` → look up that corner's `{x,y}` from the
   `corners[]` array `/api/circuit-info` already returns → place the marker there.
   Secondary fallback: place at the midpoint of the incident's `sector` segment (the
   track is already split into 3 sector segments in `CircuitMap`). Clearly comment which
   mode is active.

### Step 2.5 — Render markers and the detail popup

- In `CircuitMap.tsx`, render the markers as SVG elements **after** the track and corner
  elements (so they sit on top). Style with **tokens** (`var(--surface-3)`, etc.) — do
  **not** add hex literals.
- Markers are clickable. On click, show the incident detail (lap number, driver, flag /
  category, message, and any penalty text in the message). Use the WS-3 `Dialog` for the
  detail, **or** build a minimal `src/components/ui/popover.tsx` over
  `@base-ui/react/popover` if you prefer click-anchored detail (a popover is the nicer UX
  for a map overlay; the Dialog is the no-extra-work option).
- **Modify** `src/components/race/RaceDetailClient.tsx`: it currently passes only
  `{ year, round }` to `CircuitMap`. Either have `CircuitMap` fetch
  `/api/race-incidents` itself with its own `useQuery` (preferred — keeps `CircuitMap`
  self-contained, mirroring how it already self-fetches `/api/circuit-info`), or fetch in
  `RaceDetailClient` and pass `markers` down.

### Step 2.6 — Tests & DoD

- `incidents.test.ts` as in Step 2.2.
- Add a `/api/race-incidents` block to `validation.test.ts` (`VALID_YEAR` + `VALID_ROUND`,
  mirror `/api/team-radio`).
- Optional jsdom test: `CircuitMap` given a `markers` prop renders the expected number of
  marker elements.
- **DoD:** `npm test` green; `npm run build` passes; on a 2023+ race's Circuit tab,
  markers appear on the track and clicking one opens the detail; **the Step 2.4
  calibration has been done and recorded in the commit message**; a pre-2023 race shows
  the graceful "covers 2023+" message. Commit.

---

## Final verification (before opening a PR)

1. `npm run lint` — no new errors.
2. `npm test` — all suites green.
3. `npm run test:ci` — coverage gate (80/80/80 lines/fns/stmts, 75 branches) passes.
   If a new `src/lib/stats/*` helper drags coverage down, **add tests** — never lower the
   gate in `vitest.config.ts`.
4. `npm run build` — succeeds.
5. Manual browser pass, **dark + light theme, mobile + desktop width**, no console
   errors:
   - `/schedule` — past/upcoming headings + divider.
   - `/standings` — driver row → modal; close every way.
   - `/compare` Constructors tab — season picker changes the data + context.
   - `/drivers` — headshots load; select a card → season + career blocks.
   - `/race/2023/<round>` Circuit tab — incident markers; click → detail.
6. State explicitly in the PR description anything you could not verify in a browser.

## Risks & unknowns — verify these during the work, do not assume

| # | Risk | What to do |
|---|---|---|
| 1 | **WS-2 coordinate alignment** (highest risk) — OpenF1 `/location` vs Multiviewer coords may not match. | Do the Step 2.4 calibration. Be ready to use the fallback. |
| 2 | **WS-5 headshot host** — `headshot_url` host may not be `media.formula1.com`. | Step 5.3 — read a real URL; update CSP + `remotePatterns` if needed. |
| 3 | **WS-2 `/location` volume** — the endpoint is huge. | Only ever query a narrow per-incident date window (±4s). |
| 4 | **WS-6 Jolpica career paths** — `/results/{pos}`, `/fastest/1/results`, `MRData.total`. | Step 6.1 — hit each path live once and confirm the JSON shape. |
| 5 | **WS-2 `race_control` vocabulary** — category/flag strings are not fully documented. | Tune `classifyIncidents` against a real 2023+ payload. |
| 6 | **`drivers/page.tsx` edited twice** (WS-5 + WS-6). | Do WS-5 fully, commit, then WS-6. |
