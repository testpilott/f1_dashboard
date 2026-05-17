# Changelog

All notable changes to this project are documented here.

---

## [0.3.0] - 2026-06-01

### Added
- **Design token system** — OKLCH-based tokens in `globals.css` (`--surface-2`, `--surface-3`, `--primary`, `--muted-foreground`, `--grid-line`, etc.) powering dark-first theming
- **`src/lib/charts/theme.ts`** — `nivoTheme()` and `chartColors()` read CSS vars at runtime; single source of truth for all chart styling
- **`fetchWithTimeout`** — `src/lib/api/fetchWithTimeout.ts` wraps `fetch()` with an 8 s `AbortController` timeout; wired into jolpica, OpenF1, and Open-Meteo fetchers
- **`VALID_VIEW` validator** — Added to `src/lib/validators.ts` for the schedule route `view` param; tested in the validation suite
- **Rate limiting on schedule + logo routes** — Previously unprotected routes now use `rateLimited()`
- **Full jsdom test suite** — 172 tests across 21 files covering all pages and client components
- **Race detail test** — `src/components/race/__tests__/RaceDetailClient.test.tsx`
- **Projections page test** — `src/app/projections/__tests__/ProjectionsPage.test.tsx`
- **Compare page test** — `src/app/compare/__tests__/ComparePage.test.tsx`
- **`fetchWithTimeout` test** — `src/lib/api/__tests__/fetchWithTimeout.test.ts`

### Changed
- **LapChart** — Migrated from `recharts` to `@nivo/line`; removed `recharts` dependency entirely
- **All UI components & pages** — Fully tokenized: no hardcoded `zinc-*` or `#RRGGBB` values in JSX; all colors use design tokens
- **`error.tsx` + `ErrorBoundary.tsx`** — Tokenized to use `text-foreground`, `text-muted-foreground`, `bg-primary`, `text-primary-foreground`
- **CSP** — Removed `https://upload.wikimedia.org` from `img-src`; tightened to only allow `https://media.formula1.com`
- **`images.remotePatterns`** — Removed wikimedia entry (no longer used)
- **Vitest coverage thresholds** — Raised from 70% to lines/statements/functions 80%, branches 75%
- **README** — Fully rewritten with accurate stack, features, and security notes

---

## [0.2.0] - 2026-05-14

### Added
- **Team Logos** — Added `.webp` logo assets for all 11 constructors (Alpine, Aston Martin, Audi, Cadillac, Ferrari, Haas, McLaren, Mercedes, Racing Bulls, Red Bull Racing, Williams)
- **`TeamLogo` component** — Reusable component that serves team logos via `/api/logo` with fallback handling
- **`/api/logo` route** — API endpoint that serves team logo images from `public/logos/`
- **`/api/compare` route** — New API endpoint for head-to-head driver comparison data
- **Compare page overhaul** — Significantly expanded driver comparison UI with detailed head-to-head stats and lap time visualizations
- **`RaceDetailClient` component** — Extracted race detail view into a dedicated client component
- **`WeekendClient` component** — Extracted race weekend view into a dedicated client component for session listings and results

### Changed
- **Race detail page** (`/race/[year]/[round]`) — Refactored to use `RaceDetailClient`, reducing page complexity
- **Weekend page** — Refactored to use `WeekendClient`; improved session and result display
- **Schedule page** — Simplified and improved layout
- **Projections page** — Refreshed UI and fixed data loading
- **News page** — Fixed layout and content rendering issues
- **Standings tables** — Updated column layout and constructor display with team logos
- **Navbar** — Updated navigation links and active state styling
- **`NextRaceCard`** — Minor display improvements
- **Homepage** — Refreshed layout and data display
- **`globals.css`** — Minor global style tweaks
- **`layout.tsx`** — Updated metadata and font configuration
- **`constants.ts`** — Expanded team/constructor mapping constants
- **`jolpica.ts`** — Added additional API helper functions
- **`tsconfig.json`** — Updated compiler options for stricter type checking
- **Drivers page** — Minor display fixes

### Removed
- Unused import in `montecarlo.ts`
- Debug/unused code from `projections` API route

---

## [0.1.0] - 2026 (Initial Release)

### Added
- Next.js 15 app bootstrapped with `create-next-app`
- F1 data integration via **Jolpica** (race results, standings, schedule) and **OpenF1** (live/session data)
- Weather integration via **Open-Meteo**
- RSS news feed integration
- Pages: Home, Schedule, Standings, Race Detail, Weekend, Drivers, Compare, Projections, News
- Monte Carlo race projection engine (`lib/projections/montecarlo.ts`)
- Shared UI component library (shadcn/ui: Badge, Button, Card, Progress, Select, Separator, Skeleton, Table, Tabs, Tooltip)
- `LapChart` and `TireStrategy` race visualization components
- Dark-mode ready styling with Tailwind CSS
