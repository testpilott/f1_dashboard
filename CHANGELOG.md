# Changelog

All notable changes to this project are documented here.

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
