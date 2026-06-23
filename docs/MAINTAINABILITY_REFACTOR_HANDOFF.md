# Maintainability Refactor — Handoff

**Branch:** `claude/maintainability-refactor`
**Commits:** 6 (Groups 1–6, tagged above with `acdbaa6` → `ce5fc10`)
**Tests:** 833 → 869 (+36)
**Build:** clean throughout

## Why this happened

The codebase had five "god objects" each mixing data fetching, transformation,
and rendering in a single file. Inline logic had no names and no tests. The
refactor separates concerns into three stable layers so future contributors
know exactly where to look:

```
src/lib/<feature>/   Pure helpers — testable without React or a browser
src/hooks/           Data-fetch orchestration
src/components/      Layout and interactivity only
```

---

## Before / after file sizes

| File | Before | After | Delta | What moved out |
|---|---|---|---|---|
| `components/race/CircuitMap.tsx` | 352L | 126L | −226L | `lib/race/markers.ts`, `lib/race/sectors.ts`, `IncidentDialog`, `MarkerTally`, `CornerSelector` |
| `components/weekend/WeekendClient.tsx` | 275L | 126L | −149L | `SessionResults.tsx`, `hooks/useWeekendSessions.ts` |
| `components/race/TrackSVG.tsx` | 271L | 244L | −27L | `lib/race/trackGeometry.ts` (pure helpers) |
| `components/compare/DriversCompareTab.tsx` | 232L | 171L | −61L | `CircuitHistory.tsx` |
| `components/compare/TeamsCompareTab.tsx` | 228L | 195L | −33L | `hooks/useTeamsComparison.ts` |

---

## New files created

### `src/lib/race/` — pure helpers (no React)

| File | Exports | Tests |
|---|---|---|
| `trackGeometry.ts` | `computeTrackTransform`, `viewBoxAttr`, `markerFillColor`, `markerGlyph`, `markerAriaLabel` | `__tests__/trackGeometry.test.ts` (23 tests) |
| `markers.ts` | `buildIncidentMarkers`, `buildHotspotMarkers` | `__tests__/markers.test.ts` (8 tests) |
| `sectors.ts` | `buildSectorMap`, `buildSectorGroups`, `toggleSectorSelection`, `toggleOneCorner` | `__tests__/sectors.test.ts` (9 tests) |

Key improvements over the inline versions:
- `buildHotspotMarkers` joins hotspot→corner via `Map` (O(1) per hotspot) instead of `Array.find` (O(n)).
- `buildSectorGroups` explicitly guards against the "empty sector counts as allSelected" bug.
- `markerFillColor` replaces a 4-deep nested ternary with a flat case table.
- All functions are pure and tested with zero mocking.

### `src/components/race/`

| File | Responsibility |
|---|---|
| `IncidentDialog.tsx` | Dialog body — branches on hotspot vs incident type; `resolveTitle` extracts the title logic |
| `MarkerTally.tsx` | Count text with 3 variants (incidents only / hotspots only / both) |
| `CornerSelector.tsx` | Sector chips + corner buttons + clear selection |

### `src/components/weekend/`

| File | Responsibility |
|---|---|
| `SessionResults.tsx` | Per-session result table + per-session queries; owns `formatDuration` |

### `src/components/compare/`

| File | Responsibility |
|---|---|
| `CircuitHistory.tsx` | Circuit picker → history panel (loading/error/empty states + year table) |

### `src/hooks/`

| File | Responsibility |
|---|---|
| `useWeekendSessions.ts` | Sessions query + `SESSION_ORDER` sort; returns `{ sorted, isLoading }` |
| `useTeamsComparison.ts` | Constructor standings + teams compare queries; derives colors + validity flags |

---

## Test sweep (Group 2)

| File | Change |
|---|---|
| `src/lib/api/__tests__/clientFetch.test.ts:42` | `.rejects.toBeTruthy()` → `.rejects.toThrow(SyntaxError)` |
| `src/lib/charts/__tests__/theme.test.ts` | 3× `toBeDefined()` → type + length assertions on specific token strings |
| `src/app/api/__tests__/driver-season.test.ts:97` | Removed redundant `expect(data.summary).toBeDefined()` (the line below dereferences it anyway) |
| `src/lib/stats/__tests__/driverSeason.test.ts` | Added 2 edge tests: missing Results array; `99` fallback does not count as a podium |

---

## Efficiency wins (Group 1)

**`src/lib/stats/driverSeason.ts`** — replaced 7 separate `Array.filter` + `reduce` passes over `races[]` with a single accumulator loop computing wins, podiums, DNFs, fastest laps, finish sum, grid sum in one traversal. Semantically identical to the original; 7 existing tests pin the aggregate values exactly.

**`src/lib/api/jolpica.ts`** — renamed:
- `getSeasonResults` → `getSeasonResultsFirstPage` (JSDoc explains: first-page-only behavior is load-bearing for projections)
- `getSeasonRaceResults` → `getSeasonResultsAllPages` (paginates to completion)

All 9 call sites updated mechanically.

---

## The canonical pattern going forward

When a component grows beyond ~150L:

```
1. Identify pure transformations (no React/no fetch).
   → Move to src/lib/<feature>/helpers.ts + write node tests.

2. Identify query fan-outs.
   → Extract to src/hooks/use<Feature>.ts.

3. Identify visual sections with clear names.
   → Move to sibling component files; pass data via plain props.

4. The original file becomes an orchestrator:
   hooks + useMemo + early returns + layout only.
```

See `onboarding/10-components-theming.md` for the full worked example.

---

## Verification performed

- `npm test`: 869/869 pass after every commit (husky enforced).
- `npm run build`: clean after every group.
- `npx tsc --noEmit`: ≤57 pre-existing errors; no new errors introduced.

---

## Out of scope (deliberate)

The following were audited and explicitly left alone:

| Concern | Reason |
|---|---|
| MRData helper, clientFetch, `_views.ts` split, championship verification, snapshot types, edge cache headers, hook-driven circuit data, snapshot read tier | Already shipped in prior PRs; would be duplication |
| Server-side React Query hydration | Separate PR territory |
| Re-curating hotspot corner numbers | Requires human verification against Multiviewer |
| `providers.test.tsx` | After re-review, kept — it tests React Query config flags that can't be verified end-to-end |
| Migrating routes to `runtime = "edge"` | Incompatible with `fs.readFile` in snapshot tier |

---

## Known follow-ups

1. **WeekendClient browser pass** — the `/weekend` route returns `notFound()` in production (by product decision), so browser verification requires reverting that guard temporarily. Skipped here; test suite covers the component.

2. **Compare tab browser pass** — verify pick-two-drivers → pick circuit → history renders correctly with live 2026 data; the component tests mock all fetches.

3. **`src/lib/race/` coverage gate** — currently at 100% lines. If new branches are added, run `npm run test:coverage` to confirm the gate still holds.
