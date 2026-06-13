# F1 Dashboard

Production-grade Formula 1 dashboard built with Next.js 16, React 19, and TypeScript.

The app surfaces standings, schedule, race detail analytics, compare views, projections, and news while keeping all third-party API traffic server-side behind same-origin route handlers.

## Core Features

- Live standings for drivers and constructors.
- Race schedule with season filtering and export support.
- Race detail page with qualifying/race/sprint results, telemetry, tyre strategy, incidents, and circuit visuals.
- Driver and constructor comparison modes, including circuit history and season head-to-head stats.
- Championship projections powered by Monte Carlo simulation.
- Aggregated news feed from RSS sources.

Note: The weekend route is intentionally parked; race telemetry and related live-context data are delivered through race detail endpoints.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router + React 19 |
| Language | TypeScript |
| Styling | Tailwind v4 + shadcn/ui + OKLCH design tokens |
| Charts | Nivo |
| Server state | TanStack Query v5 |
| Data providers | Jolpica/Ergast, OpenF1, Open-Meteo, RSS |
| Testing | Vitest 2.x (currently 522 tests) |

## Local Setup

Prerequisites:
- Node.js 22.x

Recommended:
- `nvm use` (the repo includes `.nvmrc`)

Install and run:

```bash
nvm use
npm install
npm run dev
```

App runs at http://localhost:3000.

## Scripts

| Script | Purpose |
|---|---|
| npm run dev | Start dev server |
| npm run build | Production build |
| npm run start | Run production server |
| npm run lint | Lint all files |
| npm run lint:fix | Auto-fix lint issues |
| npm run type-check | TypeScript type check |
| npm test | Run Vitest once |
| npm run test:watch | Watch-mode tests |
| npm run test:coverage | Coverage run |
| npm run test:ci | CI test + coverage run |

Recommended pre-push gate:

```bash
npm run lint && npm test && npm run build
```

## Architecture

- Browser code calls same-origin route handlers only (`/api/*`).
- External API calls are server-side in fetcher modules under `src/lib/api`.
- Input validation is centralized in `src/lib/validators.ts`.
- Rate limiting is applied at the start of each route via `rateLimited()`.
- Optional upstream data should degrade gracefully using `available: false` payloads where appropriate.
- Shared caching strategy lives in `src/lib/cacheStrategy.ts`.

## Security Model

- Rate-limited API routes.
- Strict validator allowlists/regexes for all query inputs.
- CSP and hardening headers in Next config.
- No secret keys required for the current free-tier data providers.

## Data Caveats

- OpenF1 team radio availability is season-limited and intentionally capped in constants.
- Circuit SVG/CDN asset paths are season-scoped and must be bumped when upstream season assets move.

## CI

GitHub Actions workflow runs lint, tests, and production build on push/PR:
- `.github/workflows/test.yml`

## Documentation Index

- [docs/architecture.md](docs/architecture.md)
- [docs/testing.md](docs/testing.md)
- [docs/security.md](docs/security.md)
- [docs/design-system.md](docs/design-system.md)
- [docs/contributing.md](docs/contributing.md)
- [AGENTS.md](AGENTS.md)
