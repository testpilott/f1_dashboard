# 01 — Tech Stack

This dashboard is a single Next.js App Router app deployed on Vercel. The full
stack is intentionally small so the codebase stays approachable.

## Runtime and framework

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) | Server components + ISR fit the data-heavy, mostly-read workload |
| Language | **TypeScript 5** (strict) | Catches API-shape bugs upstream |
| UI | **React 19** | Required by Next 16 |
| Styling | **Tailwind CSS 4** + CSS variables | Tokens in `globals.css`; no Tailwind color utilities in components |
| Components | shadcn + Base UI primitives | Accessible, themeable, copy-into-repo |
| Charts | **Nivo** (bar, line, heatmap only) | recharts + d3 were removed to save ~150–200 kB gzip |
| Icons | **lucide-react** | |
| Data layer (client) | **TanStack React Query 5** | Caches API responses in the browser |
| Data layer (server) | Native `fetch` + Next ISR + `unstable_cache` | Lets Vercel Data Cache do the heavy lifting |
| Testing | **Vitest 2.1** + Testing Library | Node env for libs; jsdom for `*.test.tsx` |
| Linting | ESLint 9 (Next core-web-vitals + TS) | |

## Key config files

| File | What you'll change it for |
|---|---|
| [package.json](../package.json) | Dependencies, scripts |
| [next.config.ts](../next.config.ts) | Image domains, CSP headers |
| [tsconfig.json](../tsconfig.json) | Path alias `@/*` → `src/*`, strict mode |
| [vitest.config.ts](../vitest.config.ts) | Env per file glob, 80% coverage gate |
| [vitest.setup.ts](../vitest.setup.ts) | DOM polyfills used by component tests |
| [eslint.config.mjs](../eslint.config.mjs) | Lint rules |
| [postcss.config.mjs](../postcss.config.mjs) | Tailwind 4 via `@tailwindcss/postcss` |
| [components.json](../components.json) | shadcn defaults |
| [vercel.json](../vercel.json) | Cron schedules |

## Setup

```bash
nvm use            # repo uses Node 20+
npm install
npm run dev        # http://localhost:3000
```

Required env vars: only `CRON_SECRET` (Vercel sets it). Every upstream data
source is free and keyless. See [12-deployment.md](12-deployment.md) for the
full list.

## Scripts you'll use daily

```bash
npm run dev          # Turbopack dev server
npm test             # vitest run (CI-style)
npm run test:watch   # vitest watch
npm run lint         # ESLint
npm run build        # Production build (also type-checks)
npm run smoke:api    # Hit production health endpoints
```

## Upstream data sources

The app is a thin layer over four free public APIs.

| API | Used for | Notes |
|---|---|---|
| Jolpica (Ergast clone) | Schedule, results, standings, career stats | ~4 req/s soft cap per IP |
| OpenF1 | Live session telemetry, laps, stints, radio, photos | Unauthenticated tier may be blocked during a live FOM session |
| Open-Meteo | Race-weekend weather forecast | |
| Wikidata | Driver bios | |
| MultiViewer | Circuit layout + race-control events | |
| RSS (ESPN, Motorsport, etc.) | News aggregator | |

Where each fetcher lives: [05-data-fetching.md](05-data-fetching.md).

## Why this stack

- **Next App Router** gives us server components, ISR, and `unstable_cache` for
  free — no Redis or external cache needed.
- **React Query** handles the client-side staleness story so we don't reimplement
  it per component.
- **Vitest** is the fastest path to high-coverage tests for both `node` libs and
  jsdom components in the same project.
- **Tailwind + CSS variables** lets the entire design system change colors via
  CSS, without touching JSX.

Next: [02 — Project Structure](02-project-structure.md).
