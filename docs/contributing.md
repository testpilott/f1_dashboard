# Contributing

> **TL;DR** — Clone, `npm install`, `npm run dev`. Before every commit: `npm run lint`
> and `npm test` must both be green. Work on the feature branch, commit small, write
> tests first.

## Local setup

```bash
npm install
npm run dev      # http://localhost:3000
```

Requires Node 20+. No environment variables or API keys are needed — all data sources
(Jolpica/Ergast, OpenF1, OpenMeteo, RSS) are free and keyless.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build (must pass before merge) |
| `npm run lint` | ESLint (Next core-web-vitals + TS) |
| `npm test` | Full test suite (node + jsdom projects) |
| `npm run test:watch` | Tests in watch mode |
| `npm run test:ci` | Tests + coverage gate |

## Pre-commit checklist (do this every time)

1. [ ] Tests written **first** for new behaviour (TDD — see `docs/testing.md`).
2. [ ] `npm run lint` — clean.
3. [ ] `npm test` — exits 0.
4. [ ] No hardcoded colors (`zinc-*`, `red-*`, `#hex` in JSX) — use design tokens
       (see `docs/design-system.md`).
5. [ ] Commit message describes the **why**, not just the what.

> Never `--no-verify`, never commit past a red suite, never lower the coverage gate to
> make CI pass. Fix the root cause.

## Branching & commits

- Develop on the designated feature branch.
- Small, focused commits. One concern per commit (e.g. one route per commit in Phase 3).
- Reference the roadmap phase in the commit body when relevant.

## Where things live

| Area | Path |
|---|---|
| Pages (App Router) | `src/app/**/page.tsx` |
| Client components | `src/components/**` |
| Shared UI primitives | `src/components/ui/**` |
| Data fetchers | `src/lib/api/**` |
| Constants (teams, circuits…) | `src/lib/constants/**` |
| Types | `src/lib/types/**` |
| Design tokens | `src/app/globals.css` |
| Docs | `docs/**` |

See `docs/architecture.md` for the data-flow and conventions, `docs/ROADMAP.md` for the
plan of work.
