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

## Phase 0 — Safety net & tooling

- [ ] Convert test setup to two Vitest projects (`node` for `src/lib`+`src/app/api`,
      `dom` for components) — see `docs/testing.md`.
- [ ] Add testing devDeps: `@testing-library/react`, `@testing-library/jest-dom`,
      `@testing-library/user-event`, `jsdom`; add `vitest.setup.ts`.
- [ ] Add coverage thresholds + `test:ci` script.
- [ ] Add a SessionStart hook so web sessions auto-install deps.
- [ ] Write `docs/` skeletons (this file, testing, contributing).

**DoD:** `npm test` runs both projects green; `npm run test:ci` enforces thresholds.

## Phase 1 — Design token system

- [ ] Rewrite token palette in `src/app/globals.css` (dark-first, F1-red, telemetry
      chart ramp, elevation/motion tokens).
- [ ] Bridge `TEAM_COLORS` (`src/lib/constants/teams.ts`) for livery tinting; **reuse the
      existing `getTeamColor()`** — do not duplicate color literals. Add its missing tests.
- [ ] Define typography scale tokens (display/headline/title/body/caption/mono-data),
      tabular-nums for numeric data.
- [ ] Add `src/lib/charts/theme.ts` (single shared chart theme).
- [ ] Write `docs/design-system.md` in full.

**DoD:** tokens + chart theme defined; design-system doc complete; helper tests green.
No component visuals changed yet (risk isolation).

## Phase 2 — Shell & primitives restyle

- [ ] `src/app/layout.tsx`: semantic tokens only, dark-first, telemetry top bar.
- [ ] `src/components/layout/Navbar.tsx`: token-driven, local logo asset, a11y
      (`aria-current`, focus rings, keyboard nav).
- [ ] `src/components/ui/*`: consume tokens only; add broadcast variants.
- [ ] Add per-route `loading.tsx` skeletons.

**DoD:** zero raw `zinc-`/`red-`/`white` literals in shell + `ui/`; component tests
green; browser-verified (dark+light, mobile+desktop).

## Phase 3 — Page-by-page elevation (all 9 routes)

Order (low → high risk): `standings` → `/` → `schedule` → `news` → `drivers` →
`weekend` → `race/[year]/[round]` → `projections` → `compare` (build out the thin
compare page into a real head-to-head).

- [ ] standings   - [ ] home   - [ ] schedule   - [ ] news   - [ ] drivers
- [ ] weekend   - [ ] race detail   - [ ] projections   - [ ] compare

**DoD per route:** token-only styling, telemetry charts via shared theme, empty/error/
loading states, a11y + responsive, jsdom test (happy + one edge), browser-verified.

## Phase 4 — Architecture & performance hardening

- [ ] Consolidate charts to **one** library (Nivo); remove `recharts`/direct `d3`
      (justify any exception in `docs/architecture.md`).
- [ ] Add `fetchWithTimeout` (AbortController, ~8s) to jolpica/openf1/openmeteo; test it.
- [ ] Add boundary schema validation/normalization at `src/lib/api/*` (hand-written
      guards, no new heavy dep); test valid/null-field/wrong-type.
- [ ] Perf pass: image sizes, `revalidate` vs React Query `staleTime`, Suspense
      streaming, bundle-size note in `docs/architecture.md`.

**DoD:** one chart lib in `package.json`; helpers tested ≥ thresholds; architecture
doc complete.

## Phase 5 — Security hardening & docs finalization

- [ ] Write `docs/security.md` (threat model, rate-limit single-process limitation,
      validator contract, CSP rationale).
- [ ] Audit every `src/app/api/*/route.ts`: `rateLimited()` + validators applied;
      extend `src/app/api/__tests__/validation.test.ts`.
- [ ] Tighten CSP/`remotePatterns` if the external logo was removed in Phase 2.
- [ ] Rewrite `README.md`, finalize `docs/contributing.md`, append `CHANGELOG.md`;
      ratchet coverage thresholds to final targets.

**DoD:** all routes rate-limited + validated with tests; full suite + `npm run build`
green at final coverage gate; every doc has a TL;DR and runnable commands.
