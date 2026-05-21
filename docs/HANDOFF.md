# F1 Dashboard — Feature Expansion Handoff (8 Phases)

> **Read this first, then work strictly top-to-bottom.** This document is self-contained:
> every phase has exact file paths, function signatures, step-by-step instructions,
> pure-logic snippets, tests to write, risks to watch, and a "Definition of Done" you
> can verify yourself. **Do not start a phase until the previous phase's DoD is green.**

---

## 0. Orientation

### 0.1 What you are building

Nine UX/data features for the live F1 dashboard, delivered across eight phases:

| Phase | Feature(s) |
|---|---|
| 1 | Bug-fix sweep — flags, championships, constructor H2H season-scope |
| 2 | Wikidata integration layer — server-side proxy route |
| 3 | Driver card enrichment — birthplace city + optional photo |
| 4 | Season selector on every page — `/drivers`, `/standings`, `/results` |
| 5 | Deep historical comparison — back to each driver's debut |
| 6 | Circuit intelligence — race start times (3 zones) + circuit records |
| 7 | Telemetry lap-time fallback — Jolpica lap chart for pre-2023 races |
| 8 | Favorite drivers — star toggle, localStorage, favorites-first sort |

### 0.2 The stack

Next.js 16 (App Router, **modified** — see §0.6), React 19, TypeScript, Tailwind v4,
React Query v5, Vitest 2.x. Data sources (all free, always server-proxied):
**Jolpica/Ergast** (results, standings, schedule), **OpenF1** (timing/telemetry, 2023+),
**OpenMeteo** (weather), **Wikidata REST API** (birthplace/photos, new in Phase 2).

No database, no auth, free-tier only.

### 0.3 Branch & setup

```bash
git fetch origin
git checkout -b feature/expansion origin/main   # always branch from origin/main
npm install
npm test           # confirm green baseline before touching anything
```

Never push a red test suite. Commit per phase (or per logical step).

### 0.4 Phase order — DO NOT REORDER

```
Phase 1 ──▶ Phase 2 ──▶ Phase 3
   │                        │
   └──▶ Phase 4 ──▶ Phase 5 │
                            │
Phase 6 (independent)       │
   │                        │
   └──▶ Phase 7             │
                            ▼
Phase 8 (after Phase 4) ──▶ all edit drivers/page.tsx
```

Phases 1→2→3, 1→4→5, and 6→7 are each strict chains. Phase 8 requires Phase 4.
Phases 6/7 are independent of 2/3/4/5 and can be developed in parallel by a second
engineer if available.

### 0.5 Non-negotiable conventions

1. **TDD.** Write the test first or alongside. `npm test` must exit 0 before every
   commit. Every new function gets ≥1 positive test and ≥1 edge/failure test.
   Never lower the coverage gate, use `--no-verify`, or comment out a failing test.

2. **Design tokens only.** No raw hex in JSX/TSX. Use Tailwind classes such as
   `bg-surface-2`, `text-muted-foreground`, `border-border`, or `var(--…)` CSS
   variables. Raw hex is permitted only in `src/app/globals.css` and chart-theme files.

3. **Every new API route** — in this exact order:
   - Call `rateLimited(req, "<route-name>")` **first** and return its result if truthy.
   - Validate every query param using validators from `src/lib/validators.ts`.
   - Add a `describe` block to `src/app/api/__tests__/validation.test.ts`.

4. **Test environment.** Node tests for `src/lib/**` and `src/app/api/**` (pure logic).
   jsdom tests for UI components (`.test.tsx`). Mock fetch at the boundary — never hit
   the network in a test.

5. **Coverage gate.** `vitest.config.ts` enforces ≥80% lines/functions/statements and
   ≥75% branches over `src/lib/**/*.ts`. Every new `src/lib` module must have thorough
   tests. `src/lib/api/jolpica.ts` and `openf1.ts` are coverage-excluded — the thin HTTP
   fetchers you add there need no direct unit tests, but any **pure shaper function**
   you place in `src/lib` must be tested.

6. **SSR-safe pattern for client state (CC-4).** When reading `localStorage` or
   browser-only APIs in a client component:
   - Initialise React state with a constant default (not a `localStorage` read).
   - Read `localStorage` only inside a mount `useEffect`.
   - Set a `hydrated: boolean` state flag in that effect; gate any localStorage-dependent
     UI branch on `hydrated` to avoid hydration mismatch.
   - Wrap every `localStorage` access in `try/catch` (Safari private mode can throw).

7. **`useSearchParams` + `<Suspense>` boundary (CC-6).** In Next.js 16, any component
   that calls `useSearchParams()` must be wrapped in a `<Suspense>` boundary. Split
   client pages: put the `useSearchParams` read in an inner component; wrap the page's
   default export with `<Suspense fallback={<Loading />}>`.

### 0.6 "Modified Next.js 16"

This repo runs a customised Next.js 16. Before using any framework API you are unsure
about, read the guide in `node_modules/next/dist/docs/`. Heed deprecation notices.

### 0.7 Reference patterns to copy

| You are building | Copy the pattern from |
|---|---|
| Pure stats helper | `src/lib/stats/constructorH2H.ts` + its test |
| New API route | `src/app/api/compare/route.ts` |
| Route validation test | `src/app/api/__tests__/validation.test.ts` (`/api/team-radio` block) |
| `unstable_cache` wrapping | `src/app/api/projections/route.ts` |
| Lazy React Query fetch (on-select) | `driver-news` query in `src/app/drivers/page.tsx` |
| SeasonPicker usage | `src/components/schedule/ScheduleClient.tsx` |
| SSR-safe localStorage hook | See CC-4 in §0.5 and Phase 8 |

---

## Phase 1 — Bug-fix sweep

**Goal:** Fix three standalone bugs before any new features land.
Bug 1: Driver nationality flags always show checkered flag (demonym vs country name mismatch).
Bug 2: Hamilton and all multi-champion drivers show "—" for championships (wrong API path noted in code as "not available" but it is available).
Bug 3: Constructor H2H season selector only populates team dropdowns from the current season.

Each fix is independent; they touch different files.

### Step 1.1 — Nationality / flag helper

**Root cause:** `getFlag(country)` in `src/lib/constants/race.ts` is keyed by country
names (`"British"` is not in the map; `"United Kingdom"` is). Jolpica's `Driver.nationality`
field returns demonyms (e.g. `"British"`, `"Dutch"`, `"Finnish"`). The fix is a new
`DEMONYM_INFO` map in a dedicated file.

**New file:** `src/lib/constants/nationality.ts`

```ts
// Maps Jolpica nationality demonyms → { flag, country }
export const DEMONYM_INFO: Record<string, { flag: string; country: string }> = {
  // Current grid + common historical nations (add more as needed)
  American:      { flag: "🇺🇸", country: "United States" },
  Australian:    { flag: "🇦🇺", country: "Australia" },
  Austrian:      { flag: "🇦🇹", country: "Austria" },
  Belgian:       { flag: "🇧🇪", country: "Belgium" },
  Brazilian:     { flag: "🇧🇷", country: "Brazil" },
  British:       { flag: "🇬🇧", country: "United Kingdom" },
  Canadian:      { flag: "🇨🇦", country: "Canada" },
  Chinese:       { flag: "🇨🇳", country: "China" },
  Danish:        { flag: "🇩🇰", country: "Denmark" },
  Dutch:         { flag: "🇳🇱", country: "Netherlands" },
  Finnish:       { flag: "🇫🇮", country: "Finland" },
  French:        { flag: "🇫🇷", country: "France" },
  German:        { flag: "🇩🇪", country: "Germany" },
  Hungarian:     { flag: "🇭🇺", country: "Hungary" },
  Italian:       { flag: "🇮🇹", country: "Italy" },
  Japanese:      { flag: "🇯🇵", country: "Japan" },
  Mexican:       { flag: "🇲🇽", country: "Mexico" },
  Monegasque:    { flag: "🇲🇨", country: "Monaco" },
  "New Zealander": { flag: "🇳🇿", country: "New Zealand" },
  Polish:        { flag: "🇵🇱", country: "Poland" },
  Russian:       { flag: "🇷🇺", country: "Russia" },
  Spanish:       { flag: "🇪🇸", country: "Spain" },
  Swedish:       { flag: "🇸🇪", country: "Sweden" },
  Swiss:         { flag: "🇨🇭", country: "Switzerland" },
  Thai:          { flag: "🇹🇭", country: "Thailand" },
};

export function getFlagByDemonym(demonym: string): string {
  return DEMONYM_INFO[demonym]?.flag ?? "🏁";
}

export function getCountryByDemonym(demonym: string): string {
  return DEMONYM_INFO[demonym]?.country ?? demonym;
}
```

**Test:** `src/lib/constants/__tests__/nationality.test.ts` (node project).
Cover: `getFlagByDemonym("British")` → `"🇬🇧"`; `getFlagByDemonym("Dutch")` → `"🇳🇱"`;
unknown demonym → `"🏁"`; `getCountryByDemonym("British")` → `"United Kingdom"`;
unknown demonym → returns the demonym unchanged.

**Modify:** `src/app/drivers/page.tsx`. Find the line calling `getFlag(driver.Driver.nationality)` (near the driver card flag rendering) and replace it with `getFlagByDemonym(driver.Driver.nationality)`. Import from the new file.

### Step 1.2 — Championships via `driverStandings/1.json`

**Root cause:** `src/app/api/driver-career/route.ts` has
`championships: undefined` with a comment saying the endpoint is "not available" —
**this is incorrect**. The correct path is:
`drivers/{driverId}/driverStandings/1.json` → `MRData.total` (string → number).

**Modify:** `src/lib/api/jolpica.ts`. Add:

```ts
export async function getDriverCareerChampionships(driverId: string): Promise<number> {
  const data = await jolpicaFetch(`drivers/${driverId}/driverStandings/1.json`, {
    params: { limit: "1" },
    revalidate: adaptiveRevalidate("season"),
  });
  return parseInt(data?.MRData?.total ?? "0", 10) || 0;
}
```

**Modify:** `src/app/api/driver-career/route.ts`. Import and call
`getDriverCareerChampionships(driverId)`. Remove the wrong comment. Include the result
in the `Promise.allSettled` fan-out so a failure degrades to `0`, not a route crash.

**Verify manually:** `GET /drivers/hamilton/driverStandings/1.json?limit=1` against the
live Jolpica base URL in a browser. Confirm `MRData.total` is `"7"`. Adjust if the
shape differs.

### Step 1.3 — Constructor H2H season scope

**Root cause:** `src/app/compare/page.tsx` fetches constructor standings with a
hardcoded `season=current` (or `season=2026`) regardless of which season the user has
selected, so the team-picker dropdowns are always populated from the current season.

**Modify:** `src/app/compare/page.tsx`:

1. Find the `fetchConstructorStandings()` call (or React Query for the teams view).
   Add `season` as a parameter: `fetchConstructorStandings(teamsSeason)`.
2. Include `teamsSeason` in the React Query `queryKey` for the constructor standings so
   the dropdown options re-fetch when the user changes the season.
3. After re-fetch, if the currently-selected `constructorA` or `constructorB` does not
   exist in the new season's standings, reset that selection to `""` and display a
   small tooltip: `"Did not compete in {year}"`.

**DoD (Phase 1):** `npm test` green; `npm run build` passes; Hamilton shows 🇬🇧 and "7"
on `/drivers`; constructor H2H team-picker reflects the chosen season. Commit.

---

## Phase 2 — Wikidata integration layer

**Goal:** Create a server-side proxy route `/api/wikidata` that resolves a driver's
Wikipedia URL to their Wikidata QID, birthplace city label, birthplace Wikipedia link,
and optionally a photo URL. All Wikidata/Wikipedia calls are server-side — the browser
never calls external APIs directly (CSP `connect-src 'self'` unchanged).

### Step 2.1 — New validators

**Modify:** `src/lib/validators.ts`. Add:

```ts
// Wikipedia article title — URL-decoded, no leading "/"
export const VALID_WIKI_TITLE = /^[A-Za-z0-9 _\-().,'éàüöñãčšžłø%]+$/;

// Wikidata QID
export const VALID_QID = /^Q\d+$/;
```

Add test cases to `src/app/api/__tests__/validation.test.ts`:
- `VALID_WIKI_TITLE` accepts `"Lewis_Hamilton"` and `"Michael Schumacher"`, rejects
  `"../../etc/passwd"` and empty string.
- `VALID_QID` accepts `"Q9673"`, rejects `"q9673"` (lowercase), `"9673"`, `""`.

### Step 2.2 — Wikidata type definitions

**New file:** `src/lib/types/wikidata.ts`

```ts
export interface WikidataDriverProfile {
  qid: string;
  birthplaceCity: string | null;     // English label of the birthplace place entity
  birthplaceWikipediaUrl: string | null; // English Wikipedia URL for the birthplace
  photoUrl: string | null;           // Wikimedia Commons thumb URL (optional)
}
```

### Step 2.3 — Pure Wikidata parsers

**New file:** `src/lib/api/wikidata.ts` — pure parser functions + network fetchers.
All parsers are defensive (`return null`, never throw).

```ts
// ── Pure parsers (unit-tested) ─────────────────────────────────────────────

/** Extract article title from a Wikipedia URL.
 *  "https://en.wikipedia.org/wiki/Lewis_Hamilton" → "Lewis_Hamilton"
 *  Returns null for malformed URLs. */
export function parseWikipediaTitle(wikiUrl: string): string | null;

/** Extract the QID string from a wbgetentities response for a single page.
 *  Returns null when claims are missing. */
export function extractQid(entity: unknown): string | null;

/** Extract P19 (place of birth) QID from a Wikidata entity claims object.
 *  Returns null when absent. */
export function extractBirthplaceQid(entity: unknown): string | null;

/** Extract P18 (image) filename from a Wikidata entity claims object.
 *  Returns null when absent. */
export function extractPhotoFilename(entity: unknown): string | null;

/** Extract English label + English Wikipedia sitelink from a place entity.
 *  Returns { label: string | null, wikiUrl: string | null }. */
export function extractPlaceLabelAndWiki(entity: unknown): {
  label: string | null;
  wikiUrl: string | null;
};

/** Build a Wikimedia Commons thumbnail URL from a filename.
 *  Returns null for empty/null filename. */
export function commonsThumbUrl(filename: string | null, widthPx?: number): string | null;
```

Implementation notes for the parsers:
- `parseWikipediaTitle`: split on `/wiki/`, URL-decode, return the last segment or null.
- `extractQid`: navigate `entity?.id`; return if it matches `/^Q\d+$/`.
- `extractBirthplaceQid`: `entity?.claims?.P19?.[0]?.mainsnak?.datavalue?.value?.id`.
- `extractPhotoFilename`: `entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value`.
- `extractPlaceLabelAndWiki`: labels in `entity?.labels?.en?.value` and
  sitelinks in `entity?.sitelinks?.enwiki?.url`.
- `commonsThumbUrl`: build
  `https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/${encodeURIComponent(filename)}&width=${widthPx ?? 200}`.

Network fetchers (thin, use existing `fetchWithTimeout`, no direct unit tests needed):

```ts
/** Step 1: Wikipedia → QID.
 *  Calls w/api.php?action=query&prop=pageprops&titles=<title>&format=json
 *  Returns the QID string or null on failure. */
async function fetchQidForTitle(title: string): Promise<string | null>;

/** Step 2: QID → entity (P19 + P18 claims).
 *  Calls wbgetentities?ids=<qid>&props=claims|labels|sitelinks&format=json */
async function fetchEntityClaims(qid: string): Promise<unknown>;

/** Step 3: Place QID → place entity (label + sitelink).  */
async function fetchPlaceEntity(qid: string): Promise<unknown>;

/** Orchestrates steps 1–3.  Returns WikidataDriverProfile.  */
export async function fetchWikidataDriverProfile(
  wikiUrl: string,
): Promise<WikidataDriverProfile>;
```

Cache wrapping:
```ts
import { unstable_cache } from "next/cache";

export const getWikidataDriverProfile = unstable_cache(
  fetchWikidataDriverProfile,
  ["wikidata-driver"],
  { revalidate: 30 * 24 * 60 * 60 }, // 30 days
);
```
The `wikiUrl` argument is automatically folded into the cache key by `unstable_cache`.

### Step 2.4 — New API route

**New file:** `src/app/api/wikidata/route.ts`

```
GET /api/wikidata?wikiUrl=<wikipedia-url>
```

1. `const blocked = rateLimited(req, "wikidata"); if (blocked) return blocked;`
2. Read `wikiUrl`. Validate: extract the title with `parseWikipediaTitle`; if null or
   `!VALID_WIKI_TITLE.test(title)`, return `400`.
3. `const profile = await getWikidataDriverProfile(wikiUrl);`
4. Return `NextResponse.json(profile)`. `export const revalidate = 86400;`. try/catch → `500`.

### Step 2.5 — Tests

**`src/lib/api/__tests__/wikidata.test.ts` (node):**
- `parseWikipediaTitle`: standard URL → correct title; URL-encoded title; no `/wiki/` → null.
- `extractQid`: valid entity → QID; missing id field → null; non-Q id → null.
- `extractBirthplaceQid`: entity with P19 → QID; missing claims → null; wrong type → null.
- `extractPhotoFilename`: entity with P18 → filename; missing → null.
- `extractPlaceLabelAndWiki`: entity with English label + sitelink → both present;
  missing label → null; missing sitelink → null.
- `commonsThumbUrl`: known filename → URL containing filename; null input → null.

**`src/app/api/__tests__/validation.test.ts`:** add `VALID_WIKI_TITLE` and `VALID_QID`
blocks (step 2.1 above).

**DoD (Phase 2):** `npm test` green; `npm run build` passes;
`GET /api/wikidata?wikiUrl=https://en.wikipedia.org/wiki/Lewis_Hamilton` returns
`{ qid, birthplaceCity: "Stevenage", birthplaceWikipediaUrl: "https://en.wikipedia.org/wiki/Stevenage", photoUrl }`. Commit.

---

## Phase 3 — Driver card enrichment

**Goal:** Show birthplace city (with a location pin linking to the birthplace's Wikipedia
page) on the driver detail panel. Photos from Wikidata are optional (see Risk 3.1).

### Step 3.1 — Enrichment helper

**New file:** `src/lib/stats/driverEnrichment.ts`

```ts
import type { WikidataDriverProfile } from "@/lib/types/wikidata";

/** Choose the best available birthplace string.
 *  Falls back to hometown from static data when Wikidata returns null. */
export function resolveBirthplace(
  wikidata: WikidataDriverProfile | null,
  staticHometown: string | null,
): { city: string | null; wikiUrl: string | null };

/** Choose the best available photo URL.
 *  Priority: Wikidata Wikimedia photo → null (no fallback to external CDNs). */
export function resolvePhotoUrl(wikidata: WikidataDriverProfile | null): string | null;
```

`resolveBirthplace`: if `wikidata?.birthplaceCity` is non-null, return it with its
`wikidata.birthplaceWikipediaUrl`; otherwise extract the city part from
`staticHometown` (the text before the first comma) with a null wikiUrl.

**Test:** `src/lib/stats/__tests__/driverEnrichment.test.ts` (node):
- Wikidata has city + url → both returned.
- Wikidata city present, url null → city returned with null url.
- Wikidata null, static "Stevenage, England" → `{ city: "Stevenage", wikiUrl: null }`.
- Both null → `{ city: null, wikiUrl: null }`.
- `resolvePhotoUrl` returns url when present; null otherwise.

### Step 3.2 — DriverBirthplace component

**New file:** `src/components/drivers/DriverBirthplace.tsx` — presentational only.
Props: `{ city: string | null; wikiUrl: string | null }`.

Renders a `<span>` with a location pin icon (`📍` or a token-colored SVG) followed
by the city name. When `wikiUrl` is non-null, wrap the city name in an `<a>` linking to
it (opens in a new tab, `rel="noopener noreferrer"`). When `city` is null, render
nothing (`return null`). Token-only styling.

### Step 3.3 — Wire up the driver detail panel

**Modify:** `src/app/drivers/page.tsx` — the `DriverDetailPanel` inner component.

When a driver is selected:
1. The panel already fires a lazy React Query for driver news. Add a second lazy query:
   ```ts
   useQuery({
     queryKey: ["wikidata-driver", driver.Driver.url],
     queryFn: () =>
       fetch(`/api/wikidata?wikiUrl=${encodeURIComponent(driver.Driver.url)}`)
         .then(r => r.json()),
     enabled: !!driver,
     staleTime: 30 * 24 * 60 * 60 * 1000, // 30 days
   })
   ```
2. Pass the result (or `null` on error/loading) to `resolveBirthplace(wikidataData, driver.staticData?.hometown)`.
3. Render `<DriverBirthplace city={...} wikiUrl={...} />` below the driver's name/flag line.
4. Photo (`resolvePhotoUrl`) is optional — skip if `next.config.ts` `remotePatterns` do
   not already include `upload.wikimedia.org` or `commons.wikimedia.org`. Add the host
   to `remotePatterns` AND the CSP `img-src` line in `next.config.ts` if you ship photos.

**Risk (photo host):** `commonsThumbUrl` uses `commons.wikimedia.org`. Verify the URL
format is stable before adding it to `remotePatterns`. If uncertain, defer photos and
ship birthplace only.

**DoD (Phase 3):** `npm test` green; `npm run build` passes; selecting Hamilton on
`/drivers` shows "📍 Stevenage" linking to the Stevenage Wikipedia page; a driver
without Wikidata data shows their `hometown` from static data or nothing. Commit.

---

## Phase 4 — Season selector across pages

**Goal:** `/drivers`, `/standings`, and `/results` pages all accept `?season=YYYY` and
show a `<SeasonPicker>` like the schedule page already does.

### Step 4.1 — Season utility module

**New file:** `src/lib/season.ts`

```ts
const FIRST_YEAR = 1950;
const CURRENT_YEAR = 2026;

export const SEASON_OPTIONS: string[] = Array.from(
  { length: CURRENT_YEAR - FIRST_YEAR + 1 },
  (_, i) => String(CURRENT_YEAR - i),
); // ["2026", "2025", ..., "1950"]

/** Normalise a raw ?season= param.
 *  Returns "current" for "2026", the 4-digit string for valid historical years,
 *  or "current" as a fallback for anything invalid. */
export function normalizeSeason(raw: string | null): string;

/** Human-readable label, e.g. "2026 (current)" vs "2023". */
export function seasonLabel(season: string): string;

/** True for "current" or any /^\d{4}$/ value in range. */
export function isValidSeasonParam(value: string): boolean;
```

`normalizeSeason`: if null or fails `isValidSeasonParam`, return `"current"`;
if value is `"2026"`, return `"current"`; otherwise return the 4-digit string.
`seasonLabel`: if `"current"` or `"2026"`, return `"2026 (current)"`; else return the
string as-is.

**Test:** `src/lib/__tests__/season.test.ts` (node):
- `normalizeSeason(null)` → `"current"`.
- `normalizeSeason("2026")` → `"current"`.
- `normalizeSeason("2023")` → `"2023"`.
- `normalizeSeason("abcd")` → `"current"`.
- `normalizeSeason("1899")` → `"current"` (out of range).
- `isValidSeasonParam("current")` → true; `isValidSeasonParam("2023")` → true.
- `isValidSeasonParam("abcd")` → false; `isValidSeasonParam("")` → false.
- `SEASON_OPTIONS[0]` is `"2026"`; `SEASON_OPTIONS` contains `"2023"`.

### Step 4.2 — Add SeasonPicker to drivers, standings, results

`SeasonPicker` already exists at `src/components/ui/SeasonPicker.tsx`. The schedule
page uses it — copy that integration pattern.

**For each page** (`src/app/drivers/page.tsx`, `src/app/standings/page.tsx`,
`src/app/results/page.tsx` — adjust paths to match what exists):

1. The page `searchParams` prop (Next.js App Router) delivers `?season=`. Read it and
   normalise: `const season = normalizeSeason(searchParams?.season ?? null)`.
2. Pass `season` down to any data-fetching function or client component that needs it.
3. In the client component that calls `useSearchParams()` (or add one if the page is
   still a pure server component), render `<SeasonPicker current={season} />` next to
   the page heading.
4. **Suspense boundary:** any client component using `useSearchParams` must be
   wrapped in `<Suspense fallback={<Skeleton />}>` in its parent. Split the component
   into `<PageInner>` + a `<Suspense>` shell as needed (see `ScheduleClient.tsx` for the
   pattern).
5. Update any hardcoded `"2026"` or `"current season"` heading text to use `seasonLabel(season)`.

### Step 4.3 — Tests & DoD

**Test:** add cases to the existing page-level or validation tests confirming that
`normalizeSeason` rejects out-of-range/injection inputs.

**DoD (Phase 4):** `npm test` green; `npm run build` passes; choosing 2022 on
`/standings` reloads and shows 2022 standings; URL reads `?season=2022`; choosing 2026
removes `?season=` or shows `?season=2026` gracefully; heading reads `"2022"` not
`"2026"`. Commit.

---

## Phase 5 — Deep historical comparison

**Goal:** The compare page circuit-history view currently hardcodes `HISTORY_YEARS`
to the last 4 seasons. Replace this with a dynamic range computed from each driver's
actual first season, batched to avoid API rate limits, and wrapped in a long-lived cache.

### Step 5.1 — `getDriverSeasons` in Jolpica

**Modify:** `src/lib/api/jolpica.ts`. Add:

```ts
/** Returns the list of seasons a driver competed in, oldest first. */
export async function getDriverSeasons(driverId: string): Promise<number[]>;
```

Path: `drivers/${driverId}/seasons.json` (no limit needed — Jolpica returns all).
Parse `MRData.SeasonTable.Seasons` (array of `{ season: string }`), convert to numbers,
sort ascending.

### Step 5.2 — Compare history helper

**New file:** `src/lib/stats/compareHistory.ts`

```ts
/** Compute the union of years both drivers competed.
 *  Returns years descending (most recent first). */
export function computeComparisonYears(
  seasonsA: number[],
  seasonsB: number[],
): number[];

/** Split an array into chunks of size n. */
export function chunk<T>(arr: T[], n: number): T[][];

/** Build one circuit-history row from race + qualifying results for two drivers. */
export function buildCircuitHistoryRow(
  year: number,
  driverA: string,
  driverB: string,
  race: JolpicaRaceResult[],
  quali: JolpicaQualifyingResult[],
): CircuitHistoryRow | null; // null = neither driver competed that year at this circuit
```

`computeComparisonYears`: `[...new Set([...seasonsA, ...seasonsB])]` sorted descending.
`chunk`: standard chunking. `buildCircuitHistoryRow`: reuse the `pick()` logic that
already exists in `src/app/api/compare/route.ts` — extract it into this function.

**Test:** `src/lib/stats/__tests__/compareHistory.test.ts` (node):
- `computeComparisonYears([2010,2011], [2009,2011])` → `[2011,2010,2009]`.
- Both arrays empty → `[]`.
- `chunk([1,2,3,4,5], 2)` → `[[1,2],[3,4],[5]]`; empty input → `[]`.
- `buildCircuitHistoryRow` with mock data produces the correct `a` / `b` picks.
- `buildCircuitHistoryRow` where neither driver appears returns null.

### Step 5.3 — Update the compare route

**Modify:** `src/app/api/compare/route.ts`, circuit-history branch (default view):

1. **Delete** `const HISTORY_YEARS = ...` (lines 15–16).
2. After validating `driverA` / `driverB` / `circuitId`, call:
   ```ts
   const [seasonsA, seasonsB] = await Promise.all([
     getDriverSeasons(driverA),
     getDriverSeasons(driverB),
   ]);
   const years = computeComparisonYears(seasonsA, seasonsB);
   ```
3. **Batch in groups of 5** to stay within Jolpica's free-tier rate limit:
   ```ts
   const history: CircuitHistoryRow[] = [];
   for (const batch of chunk(years, 5)) {
     const rows = await Promise.all(
       batch.map(async (year) => {
         const [race, quali] = await Promise.allSettled([...]);
         return buildCircuitHistoryRow(year, driverA, driverB, ...);
       }),
     );
     history.push(...rows.filter(Boolean));
   }
   ```
4. Wrap the entire compute in `unstable_cache` (6-hour TTL), keyed by
   `["compare-circuit", driverA, driverB, circuitId]`.

**Modify:** `src/app/compare/page.tsx` — drop any client-side year cap.

**DoD (Phase 5):** `npm test` green; `npm run build` passes;
Hamilton vs Alonso at Monaco shows rows back to their respective debuts (~2001 and
~2007); the cache warms on first load and subsequent loads are fast. Commit.

---

## Phase 6 — Circuit intelligence (start times + records)

**Goal:** The race detail page shows three localised start times and a circuit-records
panel (most wins, most poles, fastest lap holder).

### Step 6.1 — Race time utility

**New file:** `src/lib/time/raceTime.ts`

```ts
import { CIRCUIT_COORDS } from "@/lib/constants/circuits"; // existing, has IANA timezones

/** Build start time representations for a race.
 *  Returns null fields for missing/malformed input — never throws. */
export function buildRaceStartTimes(
  dateStr: string,       // "2024-03-24"
  timeStr: string | null, // "15:00:00Z" or null
  circuitId: string,
): {
  venue: string | null;     // formatted in circuit's IANA timezone
  eastern: string | null;   // US Eastern (DST-aware: "EDT" or "EST")
  // browser-local is computed client-side to avoid SSR hydration mismatch
};

/** Format an ISO datetime string in a given IANA timezone.
 *  Returns null on any error. */
export function formatInZone(iso: string, tz: string): string | null;

/** Validate that circuitId exists in CIRCUIT_COORDS and has a timezone string. */
export function validateCircuitTimezone(circuitId: string): boolean;

/** Parse an F1 lap time string "m:ss.mmm" → milliseconds.  Returns NaN for bad input. */
export function lapTimeToMs(lapTime: string): number;
```

Use `Intl.DateTimeFormat` with `timeZone` option for timezone conversion.
`formatInZone`: construct the ISO datetime, create `Intl.DateTimeFormat` for `tz`, call
`.format(new Date(iso))`, return result or null on error.
`lapTimeToMs`: split on `":"`, convert `m * 60000 + parseFloat(s) * 1000`, return `NaN`
if either part is non-numeric.

**Test:** `src/lib/time/__tests__/raceTime.test.ts` (node):
- `lapTimeToMs("1:23.456")` → `83456`.
- `lapTimeToMs("0:58.100")` → `58100`.
- `lapTimeToMs("bad")` → `NaN`.
- `buildRaceStartTimes` with a valid date/time + known circuit → venue and eastern both non-null.
- `buildRaceStartTimes` with null time → both null.
- `validateCircuitTimezone("monza")` → true (or whichever id exists); `"fakecircuit"` → false.

### Step 6.2 — Circuit records helper

**New file:** `src/lib/stats/circuitRecords.ts`

```ts
export interface CircuitRecords {
  mostWins:  { driverId: string; name: string; count: number } | null;
  mostPoles: { driverId: string; name: string; count: number } | null;
  fastestLap: { driverId: string; name: string; time: string; year: number } | null;
}

/** Compute circuit records from all historical race results at a circuit.
 *  Expects an array of Jolpica race results (already fetched by the caller). */
export function computeCircuitRecords(races: Race[]): CircuitRecords;
```

`mostWins`: count finishes in position 1 per driver; pick the max.
`mostPoles`: count grid position 1 per driver; pick the max.
`fastestLap`: across all races, find the entry with `FastestLap?.rank === "1"` and the
lowest `FastestLap.Time.time` (use `lapTimeToMs` from `raceTime.ts` to compare).

**Test:** `src/lib/stats/__tests__/circuitRecords.test.ts` (node):
- Three races, one driver wins twice → `mostWins.count === 2`.
- No finishes → all fields null.
- Fastest lap correctly picks the lowest time across years.
- Empty input → all fields null.

### Step 6.3 — Circuit records route

**New file:** `src/app/api/circuit-records/route.ts`

```
GET /api/circuit-records?circuitId=<id>
```

1. `rateLimited(req, "circuit-records")` first.
2. Validate `circuitId` with `VALID_ID`.
3. `const allRaces = await getRaceResultsAtCircuit("all", circuitId)` — you may need to
   add this variant to `jolpica.ts` (pass the `circuitId` filter without a year). Check
   the Jolpica docs (`/api/f1/circuits/{id}/results.json`) for the correct path.
4. `const records = computeCircuitRecords(allRaces);`
5. Wrap steps 3–4 in `unstable_cache(…, ["circuit-records", circuitId], { revalidate: 6 * 3600 })`.
6. Return `NextResponse.json({ circuitId, records })`. try/catch → `500`.

Add to `validation.test.ts`: `VALID_ID` accepts `"monza"`, rejects `"../../etc"`.

### Step 6.4 — UI components

**New file:** `src/components/race/RaceStartTimes.tsx` — presentational.
Props: `{ venue: string | null; eastern: string | null; browserLocal: string | null }`.
Render a three-column chip row. `browserLocal` is passed in from a client-side effect
(see Step 6.5) and may be null on the server render — do not SSR it.

**New file:** `src/components/race/CircuitRecords.tsx` — presentational.
Props: `{ records: CircuitRecords }`. Render three stat cards. Token-only colors.
If a field is null, show `"—"`.

### Step 6.5 — Wire up the race detail page

**Modify:** `src/components/race/RaceDetailClient.tsx` (or the race detail page):

1. **Start times:** call `buildRaceStartTimes(race.date, race.time ?? null, circuitId)`.
   Compute `browserLocal` on the client side in a `useEffect` using
   `new Intl.DateTimeFormat(undefined, { … }).format(raceDate)` and set it into local
   state — never compute it on the server to avoid hydration mismatch.
   Render `<RaceStartTimes venue={…} eastern={…} browserLocal={browserLocal} />`.

2. **Circuit records:** add a React Query (lazy or on-mount):
   ```ts
   useQuery({
     queryKey: ["circuit-records", circuitId],
     queryFn: () => fetch(`/api/circuit-records?circuitId=${circuitId}`).then(r => r.json()),
     staleTime: 6 * 60 * 60 * 1000,
   })
   ```
   Render `<CircuitRecords records={data?.records} />` with a `<Skeleton>` fallback.

**DoD (Phase 6):** `npm test` green; `npm run build` passes; the race detail page shows
three correctly time-zoned start times and a records panel; DST is handled correctly
(test with a race in winter vs summer). Commit.

---

## Phase 7 — Telemetry lap-time fallback

**Goal:** For races before 2023 (or when OpenF1 returns empty), show a Jolpica-sourced
lap-time chart with pit-stop markers.

> **Depends on Phase 6** only for `lapTimeToMs`. Phases 2–5 are not required.

### Step 7.1 — Jolpica lap and pitstop fetchers

**Modify:** `src/lib/api/jolpica.ts`. Add:

```ts
/** Fetch lap times for all drivers. Jolpica paginates at 100 by default.
 *  Fetches pages until no more data. Covers 1996+. */
export async function getRaceLaps(year: string, round: string): Promise<JolpicaLap[]>;

/** Fetch pit-stop records for a race. */
export async function getRacePitstops(year: string, round: string): Promise<JolpicaPitstop[]>;
```

Add the corresponding types to `src/lib/types/jolpica.ts`:
```ts
export interface JolpicaLap {
  number: string;            // lap number string
  Timings: { driverId: string; position: string; time: string }[];
}
export interface JolpicaPitstop {
  driverId: string;
  lap: string;
  stop: string;
  duration: string;
}
```

Pagination note for `getRaceLaps`: Jolpica returns `MRData.total` and `MRData.offset`.
Fetch with `limit=100`; loop while `offset + returned < total`.

### Step 7.2 — Lap analysis helper

**New file:** `src/lib/stats/lapAnalysis.ts`

```ts
import { lapTimeToMs } from "@/lib/time/raceTime"; // from Phase 6

export interface LapSeriesPoint { lap: number; ms: number; driverId: string }
export interface PitstopMarker { lap: number; driverId: string; durationMs: number }

/** Build per-driver lap-time series (milliseconds). Skip null/malformed times. */
export function buildLapSeries(laps: JolpicaLap[], driverIds: string[]): LapSeriesPoint[];

/** Summarise pace: median lap time per driver (excluding outliers: first lap + laps
 *  more than 2× the driver's median). */
export function summarisePace(
  series: LapSeriesPoint[],
): { driverId: string; medianMs: number }[];

/** Map pitstop records to markers for the chart. */
export function mapPitstops(pitstops: JolpicaPitstop[], driverIds: string[]): PitstopMarker[];
```

**Test:** `src/lib/stats/__tests__/lapAnalysis.test.ts` (node):
- `buildLapSeries` with valid laps → correct ms conversion via `lapTimeToMs`.
- Malformed time strings → those points omitted.
- `summarisePace` correctly computes median; outlier laps excluded.
- `mapPitstops` returns entries only for the requested drivers.
- Empty input arrays → empty output.

### Step 7.3 — Race laps API route

**New file:** `src/app/api/race-laps/route.ts`

```
GET /api/race-laps?year=<year>&round=<round>
```

1. `rateLimited(req, "race-laps")` first.
2. Validate `year` with `VALID_YEAR`, `round` with `VALID_ROUND`.
3. Fetch laps and pitstops concurrently:
   ```ts
   const [laps, pitstops] = await Promise.all([
     getRaceLaps(year, round),
     getRacePitstops(year, round),
   ]);
   ```
4. Extract unique `driverIds` from the laps data; build series + pitstop markers.
5. Return `NextResponse.json({ year, round, series, pitstops: markers })`.
   `export const revalidate = 6 * 3600;`. try/catch → `500`.

Add to `validation.test.ts`: `VALID_YEAR` + `VALID_ROUND` block.

### Step 7.4 — Fallback chart component

**New file:** `src/components/race/LapTimeFallbackChart.tsx`

Props: `{ series: LapSeriesPoint[]; pitstops: PitstopMarker[] }`.

Use an existing Nivo `<ResponsiveLine>` (the codebase already uses Nivo — reuse the
shared chart theme from `src/lib/charts/theme.ts`). Each driver is a line series; add
vertical reference lines at pit-stop laps. Token-only annotation colors.

### Step 7.5 — Wire into the race detail telemetry tab

**Modify:** the telemetry section in `src/components/race/RaceDetailClient.tsx`:

```ts
const year = parseInt(raceYear, 10);
const showOpenF1 = year >= 2023 && openF1DataIsPresent;
if (!showOpenF1) {
  // use Jolpica fallback
  const { data } = useQuery({
    queryKey: ["race-laps", raceYear, round],
    queryFn: () => fetch(`/api/race-laps?year=${raceYear}&round=${round}`).then(r => r.json()),
  });
  return <LapTimeFallbackChart series={data?.series ?? []} pitstops={data?.pitstops ?? []} />;
}
```

**DoD (Phase 7):** `npm test` green; `npm run build` passes; navigating to a 2010 race
detail shows the lap-time chart with pit markers; a 2024 race still shows the OpenF1
telemetry. Commit.

---

## Phase 8 — Favorite drivers

**Goal:** A star toggle on each driver card persists the user's favorites in
`localStorage`; favorited drivers sort to the top of the `/drivers` grid.

> **Depends on Phase 4** — both phases edit `src/app/drivers/page.tsx`. Complete Phase 4
> and commit before starting Phase 8.

### Step 8.1 — Pure favorites helpers

**New file:** `src/lib/favorites.ts`

```ts
const STORAGE_KEY = "f1_favorite_drivers";

/** Parse the stored JSON safely. Returns empty array on any error. */
export function parseFavorites(raw: string | null): string[];

/** Serialise to JSON string for localStorage. */
export function serialiseFavorites(ids: string[]): string;

/** Toggle: add if absent, remove if present. Returns new array. */
export function toggleFavorite(current: string[], driverId: string): string[];

/** True when driverId is in the list. */
export function isFavorite(ids: string[], driverId: string): boolean;

/** Sort: favorites first (stable relative order within each group). */
export function sortFavoritesFirst<T>(
  items: T[],
  getId: (item: T) => string,
  favorites: string[],
): T[];
```

`parseFavorites`: `JSON.parse` inside `try/catch`; return `[]` if the result is not
an `Array` of strings.
`serialiseFavorites`: `JSON.stringify(ids)`.
`toggleFavorite`: `isFavorite(current, id) ? current.filter(x => x !== id) : [...current, id]`.
`sortFavoritesFirst`: separate into `fav` and `rest` by `isFavorite`, return `[...fav, ...rest]`.

**Test:** `src/lib/__tests__/favorites.test.ts` (node):
- `parseFavorites(null)` → `[]`.
- `parseFavorites('["hamilton"]')` → `["hamilton"]`.
- `parseFavorites("not json")` → `[]`.
- `parseFavorites('{"key":"val"}')` → `[]` (not an array).
- `toggleFavorite([], "hamilton")` → `["hamilton"]`.
- `toggleFavorite(["hamilton"], "hamilton")` → `[]`.
- `isFavorite(["hamilton"], "hamilton")` → true; `isFavorite([], "hamilton")` → false.
- `sortFavoritesFirst(items, getId, ["verstappen"])` → verstappen first, rest stable.

### Step 8.2 — `useFavorites` hook

**New file:** `src/hooks/useFavorites.ts`

```ts
"use client";
import { useState, useEffect } from "react";
import {
  parseFavorites, serialiseFavorites, toggleFavorite, isFavorite,
} from "@/lib/favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]); // constant default (CC-4)
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setFavorites(parseFavorites(localStorage.getItem("f1_favorite_drivers")));
    } catch {
      // ignore — Safari private mode can throw
    }
    setHydrated(true);
  }, []);

  function toggle(driverId: string) {
    setFavorites((prev) => {
      const next = toggleFavorite(prev, driverId);
      try { localStorage.setItem("f1_favorite_drivers", serialiseFavorites(next)); } catch { /* ignore */ }
      return next;
    });
  }

  return { favorites, hydrated, toggle, isFavorite: (id: string) => isFavorite(favorites, id) };
}
```

### Step 8.3 — `FavoriteStar` component

**New file:** `src/components/drivers/FavoriteStar.tsx`

Props: `{ driverId: string; isFavorite: boolean; onToggle: () => void }`.

Render a `<button>` (not a nested interactive element inside a card anchor) with
`aria-label="Add to favorites"` / `"Remove from favorites"`. Show a filled star (⭐)
when favorited, outline star (☆) otherwise. Token-only styling; focus ring via tokens.

Position it as an absolutely-positioned sibling of the card content with
`position: absolute; top: 0.5rem; right: 0.5rem` so it doesn't nest inside another
`<button>` or `<a>`.

### Step 8.4 — Wire up the drivers page

**Modify:** `src/app/drivers/page.tsx`:

1. Call `const { favorites, hydrated, toggle, isFavorite: isFav } = useFavorites();` at
   the top of the client component.
2. Wrap the driver-list rendering in `useMemo`:
   ```ts
   const sortedDrivers = useMemo(
     () => hydrated ? sortFavoritesFirst(drivers, d => d.Driver.driverId, favorites) : drivers,
     [drivers, favorites, hydrated],
   );
   ```
   Gate the sort on `hydrated` to ensure the server-rendered order is stable
   (no hydration mismatch).
3. For each card, render `<FavoriteStar>` as an absolutely-positioned sibling.
   The card container must have `position: relative`.

**DoD (Phase 8):** `npm test` green; `npm run build` passes; starring a driver moves
them to the top after toggle; the star persists across a page reload; Safari private
mode does not crash; the server render and first client render show the same order
(no hydration warning in the console). Commit.

---

## Final verification (before opening a PR)

1. `npm run lint` — no new errors.
2. `npm test` — all suites green.
3. `npm run test:ci` — coverage gate (≥80% lines/fns/stmts, ≥75% branches) passes.
   If a new `src/lib` module drags coverage down, **add tests** — never lower the gate.
4. `npm run build` — succeeds (or the pre-existing SSG sandbox limitation — see
   `docs/architecture.md` "Build sandbox limitation").
5. Manual browser pass, dark + light theme, mobile + desktop viewport, no console errors:
   - `/drivers` — correct flags; Hamilton shows "7" championships; star toggles persist.
   - `/drivers` (selecting Hamilton) — Stevenage birthplace with Wikipedia link.
   - `/standings`, `/results` — season picker changes data; URL persists.
   - `/compare` (Constructors tab) — season picker populates correct teams.
   - `/compare` (Circuit tab) — Hamilton vs Alonso at Monaco shows rows back to debuts.
   - Race detail page — three start times, circuit records panel, lap chart on pre-2023.
6. State explicitly in the PR description anything you could not browser-verify.

---

## Risks & unknowns — verify during work, do not assume

| # | Risk | What to do |
|---|---|---|
| 1 | **Jolpica `/driverStandings/1.json` shape** — `MRData.total` may differ. | Hit the endpoint live for Hamilton before relying on it. |
| 2 | **Wikidata P18 photo URL format** — `commonsThumbUrl` builds a redirect URL, not a direct CDN URL. Verify the format is stable before adding to `remotePatterns`. | Skip photos if uncertain; ship birthplace only. |
| 3 | **Wikidata claims path depth** — API responses can be deeply nested with optional fields. | All parsers must return null, never throw. Test every null branch. |
| 4 | **Jolpica lap pagination** — races pre-2000 may have no lap data. | `getRaceLaps` must handle an empty or missing `Timings` gracefully. |
| 5 | **`CIRCUIT_COORDS` IANA timezone strings** — some IDs may be wrong for DST edge cases. | `validateCircuitTimezone` test; fallback to UTC if the format throws. |
| 6 | **`drivers/page.tsx` edited in Phases 1, 3, 4, and 8** — do each phase fully, commit, then start the next. | Never leave `drivers/page.tsx` partially edited between phases. |
| 7 | **Constructor H2H season re-fetch** — a season with no data for a team should reset the selection, not crash. | Handle empty `ConstructorStandings` array gracefully in the compare page. |
