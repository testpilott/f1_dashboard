# F1 Dashboard — Overhaul Roadmap

> **TL;DR** — We are turning a technically-modern but visually-generic dashboard into a
> professional **"F1 broadcast" (F1 TV / FOM-style)** product: dark-first, F1-red accents,
> telemetry-style charts, a real design-token system, a hardened data layer, real test
> coverage behind a CI gate, and proper docs. Work top-to-bottom. Do **not** start a phase
> until the previous phase's "Definition of Done" is green.

## How to use this document

- Each phase has numbered steps and a **Definition of Done (DoD)**.
- Tick a box only when its tests pass and `npm test` exits 0.
- This is a **modified Next.js 16** — before using any framework API that differs from
  what you remember, read the matching guide in `node_modules/next/dist/docs/`.
- TDD is mandatory (see `docs/testing.md` and `AGENTS.md`). Write the test first.

## Constraints (do not violate)

- **Free-tier only**: no paid APIs, services, fonts, or assets.
- Keep current data sources: Jolpica/Ergast, OpenF1, OpenMeteo, RSS.
- No database, no auth.
- Prefer existing dependencies over adding new heavy ones.
- All 9 existing routes are kept and elevated (none removed).

---

## Phase 0 — Safety net & tooling ✅

- [x] Convert test setup to two Vitest projects (`node` for `src/lib`+`src/app/api`,
      `dom` for components) — see `docs/testing.md`.
- [x] Add testing devDeps: `@testing-library/react`, `@testing-library/jest-dom`,
      `@testing-library/user-event`, `jsdom`; add `vitest.setup.ts`.
- [x] Add coverage thresholds + `test:ci` script.
- [x] Add a SessionStart hook so web sessions auto-install deps.
- [x] Write `docs/` skeletons (this file, testing, contributing).

**DoD:** `npm test` runs both projects green; `npm run test:ci` enforces thresholds.

## Phase 1 — Design token system ✅

- [x] Rewrite token palette in `src/app/globals.css` (dark-first, F1-red, telemetry
      chart ramp, elevation/motion tokens).
- [x] Bridge `TEAM_COLORS` (`src/lib/constants/teams.ts`) for livery tinting; **reuse the
      existing `getTeamColor()`** — do not duplicate color literals. Add its missing tests.
- [x] Define typography scale tokens (display/headline/title/body/caption/mono-data),
      tabular-nums for numeric data.
- [x] Add `src/lib/charts/theme.ts` (single shared chart theme).
- [x] Write `docs/design-system.md` in full.

**DoD:** tokens + chart theme defined; design-system doc complete; helper tests green.
No component visuals changed yet (risk isolation).

## Phase 2 — Shell & primitives restyle ✅

- [x] `src/app/layout.tsx`: semantic tokens only, dark-first, telemetry top bar.
- [x] `src/components/layout/Navbar.tsx`: token-driven, local logo asset, a11y
      (`aria-current`, focus rings, keyboard nav).
- [x] `src/components/ui/*`: consume tokens only; add broadcast variants.
- [x] Add per-route `loading.tsx` skeletons.

**DoD:** zero raw `zinc-`/`red-`/`white` literals in shell + `ui/`; component tests
green; browser-verified (dark+light, mobile+desktop).

## Phase 3 — Page-by-page elevation (all 9 routes) ✅

Order (low → high risk): `standings` → `/` → `schedule` → `news` → `drivers` →
`weekend` → `race/[year]/[round]` → `projections` → `compare` (build out the thin
compare page into a real head-to-head).

- [x] standings   - [x] home   - [x] schedule   - [x] news   - [x] drivers
- [x] weekend   - [x] race detail   - [x] projections   - [x] compare

**DoD per route:** token-only styling, telemetry charts via shared theme, empty/error/
loading states, a11y + responsive, jsdom test (happy + one edge), browser-verified.

## Phase 4 — Architecture & performance hardening ✅

- [x] Consolidate charts to **one** library (Nivo); remove `recharts`/direct `d3`
      (justify any exception in `docs/architecture.md`).
- [x] Add `fetchWithTimeout` (AbortController, ~8s) to jolpica/openf1/openmeteo; test it.
- [x] Add boundary schema validation/normalization at `src/lib/api/*` (hand-written
      guards, no new heavy dep); test valid/null-field/wrong-type.
- [x] Perf pass: image sizes, `revalidate` vs React Query `staleTime`, Suspense
      streaming, bundle-size note in `docs/architecture.md`.

**DoD:** one chart lib in `package.json`; helpers tested ≥ thresholds; architecture
doc complete.

## Phase 5 — Security hardening & docs finalization ✅

- [x] Write `docs/security.md` (threat model, rate-limit single-process limitation,
      validator contract, CSP rationale).
- [x] Audit every `src/app/api/*/route.ts`: `rateLimited()` + validators applied;
      extend `src/app/api/__tests__/validation.test.ts`.
- [x] Tighten CSP/`remotePatterns` if the external logo was removed in Phase 2.
- [x] Rewrite `README.md`, finalize `docs/contributing.md`, append `CHANGELOG.md`;
      ratchet coverage thresholds to final targets.

**DoD:** all routes rate-limited + validated with tests; full suite + `npm run build`
green at final coverage gate; every doc has a TL;DR and runnable commands.

---

## Post-handoff — Data & Features round ✅

Features-first follow-up after the handoff review. See `docs/architecture.md`
"Post-handoff additions" for endpoint/contract detail.

- [x] **WS-1** Driver form & momentum chips on standings (`/api/form`, pure
      `lib/stats/form.ts`) + medal-badge color tokens (defect #1 partial).
- [x] **WS-2** Race Detail "Telemetry" tab (`/api/telemetry`, pure `lib/stats/pace.ts`
      + `session-match.ts`) + fastest-lap/sprint `--accent-2` token (defect #1 partial).
- [x] **WS-3** Compare season head-to-head (`/api/compare?view=season`, pure
      `lib/stats/headToHead.ts`) + stray purple → token.
- [x] **WS-4** iCal export (`/api/schedule/export`, pure `lib/ical.ts`) + the missing
      `ScheduleClient` test (defect #2) + Sprint-badge token.
- [x] **WS-5** Cleanup: `fetchWithTimeout` spec-aligned (defect #3); remaining
      `drivers/page.tsx` colors → tokens (defect #1 done); `.claude/settings.json`
      SessionStart hook (defect #4); `LapChart` rules-of-hooks bug + 2 purity errors
      fixed; docs updated.

**Status:** test suite 174 → **238** passing; `npm run test:ci` green (coverage well
above the 80/75/80 gate). Lint errors 8 → **5** (remaining are pre-existing intentional
SSR hydration guards — tracked in `docs/architecture.md` "Known lint debt").

**Intentionally not done (tracked in `docs/architecture.md`):**
- Weekend route stays parked (product decision) — telemetry value delivered via Race
  Detail instead.
- 5 `react-hooks/set-state-in-effect` lint errors — need a browser-verified
  `useSyncExternalStore` refactor; advisory rule, not correctness.
- `npm run build` SSG-vs-sandbox `403` — environmental; fix by marking data pages
  dynamic (separate task).

---

## Tier-2/3 feature round ✅

Previously-deferred features, all free-tier, no new heavy deps.

- [x] **Historical season browsing** — `SeasonPicker` component; standings + schedule
      pages accept `?season=YYYY` (`searchParams` prop); 2021–2026 supported; validates
      with `/^\d{4}$/`; maps 2026 → `"current"` for Jolpica.
- [x] **Adaptive caching** — `src/lib/cacheStrategy.ts`; race-weekend heuristic
      (Fri/Sat/Sun = shorter ISR TTLs); all `jolpicaFetch` + `openF1Fetch` calls use
      `adaptiveRevalidate(dataClass)` instead of hardcoded constants; 10 pure-function
      tests in `cacheStrategy.test.ts`.
- [x] **Global search** — `GET /api/search?q=` (rate-limited, `VALID_SEARCH_QUERY`
      validated, 1 h revalidate); pure `src/lib/search.ts` scorer (prefix > infix,
      no external dep); `GlobalSearch` command-palette component (Cmd/Ctrl+K, arrow
      navigation, Enter to navigate, Escape to close) added to Navbar.
- [x] **Constructor-vs-constructor compare** — `src/lib/stats/constructorH2H.ts`
      (pure, 7 unit tests); `GET /api/compare?view=teams&constructorA=&constructorB=&
      season=` branch (reuses `VALID_ID` + `VALID_SEASON`); new "Constructors" tab on
      the compare page with selector cards + stat bars.
- [x] **Team radio** — `OpenF1TeamRadio` type; `getTeamRadio()` in `openf1.ts`;
      `GET /api/team-radio?year=&round=` (rate-limited, `VALID_YEAR`/`VALID_ROUND`,
      session-resolved via `pickRaceSession`); `TeamRadioPanel.tsx` collapsible per
      driver + `<audio controls preload="none">`; "Radio" tab on Race Detail (2023+
      sessions only).

**Test count:** 269 passing (31 test files). `npm run lint` 0 errors / 5 pre-existing
advisory warnings. `npm run build` clean.

---

## Six-feature handoff round status ✅

- [x] WS-1 Schedule past/upcoming divider
- [x] WS-2 Race incident markers on circuit map
- [x] WS-3 Standings driver modal with season breakdown
- [x] WS-4 Constructor comparison context expansion
- [x] WS-5 Driver headshot photos
- [x] WS-6 Drivers season + career expanded stats

**Latest verification snapshot (2026-05-21):** 372 passing tests (43 test files).
`npm run build` passes. `npm run lint` reports **0 errors, 0 warnings**.

---

## Feature expansion — 9 features, 8 phases (in progress)

Detailed implementation guide for a junior engineer: `docs/HANDOFF.md`.
See `docs/architecture.md` "Feature-expansion additions" for new routes and patterns.

| Phase | Feature | Status |
|---|---|---|
| 1 | **Bug-fix sweep** — correct nationality flags, championships via `driverStandings/1.json`, constructor H2H season scope | ☐ |
| 2 | **Wikidata layer** — `/api/wikidata` server-side proxy for birthplace + photo | ☐ |
| 3 | **Driver card enrichment** — birthplace city with Wikipedia link, optional photo | ☐ |
| 4 | **Season selector across pages** — `/drivers`, `/standings`, `/results` accept `?season=YYYY` | ☐ |
| 5 | **Deep historical compare** — circuit H2H back to each driver's debut, batched + cached | ☐ |
| 6 | **Circuit intelligence** — race start times (venue/Eastern/local) + circuit records panel | ☐ |
| 7 | **Telemetry fallback** — Jolpica lap-time chart + pit markers for pre-2023 races | ☐ |
| 8 | **Favorite drivers** — star toggle, localStorage, favorites-first sort | ☐ |

**New lib modules:** `src/lib/season.ts`, `src/lib/favorites.ts`,
`src/lib/constants/nationality.ts`, `src/lib/time/raceTime.ts`,
`src/lib/api/wikidata.ts`, `src/lib/stats/{driverEnrichment,compareHistory,
circuitRecords,lapAnalysis}.ts`.

**New routes:** `/api/wikidata`, `/api/circuit-records`, `/api/race-laps`.

**Constraints:** free-tier only, no new heavy deps, all 9 existing routes preserved,
TDD + coverage gate throughout.
