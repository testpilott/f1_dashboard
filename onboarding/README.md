# F1 Dashboard — Intern Engineer Walkthrough

Welcome. This folder is the guided tour of how the F1 Dashboard was built and
why each piece exists. It is written for an engineer who is new to the project
(and possibly new to the Next.js App Router) and wants enough context to ship a
change in their first week without breaking production.

If you only have 30 minutes, read in this order:

1. [01-tech-stack.md](01-tech-stack.md) — what we use and why
2. [03-architecture.md](03-architecture.md) — the 10,000-ft view (with diagram)
3. [04-request-lifecycle.md](04-request-lifecycle.md) — what happens when a user loads a page
4. [13-recipes.md](13-recipes.md) — copy-paste templates for the common tasks

## Full reading order

| # | Chapter | What you learn |
|---|---|---|
| 01 | [Tech Stack](01-tech-stack.md) | Frameworks, libraries, config files |
| 02 | [Project Structure](02-project-structure.md) | What lives where in `src/` |
| 03 | [Architecture](03-architecture.md) | System context and invariants |
| 04 | [Request Lifecycle](04-request-lifecycle.md) | SSR page + API route sequences |
| 05 | [Data Fetching Layer](05-data-fetching.md) | `createApiFetcher`, retry, limiter |
| 06 | [Caching Strategy](06-caching.md) | 5-tier `DataClass` model |
| 07 | [API Routes Catalog](07-api-routes.md) | Every route, upstream, TTL |
| 08 | [Pages Walkthrough](08-pages.md) | Each user-facing route |
| 09 | [Stats & Projections](09-stats-and-projections.md) | Pure compute + Monte Carlo |
| 10 | [Components & Theming](10-components-theming.md) | Server vs client, design tokens |
| 11 | [Testing](11-testing.md) | Vitest TDD workflow |
| 12 | [Deployment](12-deployment.md) | Vercel, cron, segment-config rules |
| 13 | [Recipes](13-recipes.md) | Copy-paste templates |

## Diagrams

PlantUML sources live in [diagrams/](diagrams/). They render natively on GitHub
with a PlantUML extension, in VS Code with `jebbs.plantuml`, or via
`https://www.plantuml.com/plantuml/uml/`. Each chapter that references a diagram
also embeds a small Mermaid version for instant preview.

| Source | Shows |
|---|---|
| [system-context.puml](diagrams/system-context.puml) | Browser ⇄ Next.js ⇄ upstream APIs |
| [request-lifecycle-page.puml](diagrams/request-lifecycle-page.puml) | SSR page render path |
| [request-lifecycle-api.puml](diagrams/request-lifecycle-api.puml) | API route happy path + retries |
| [data-fetching-stack.puml](diagrams/data-fetching-stack.puml) | Fetcher → limiter → retry → cache layers |
| [caching-decision.puml](diagrams/caching-decision.puml) | How a request picks its TTL |
| [projections-cron.puml](diagrams/projections-cron.puml) | Monte Carlo snapshot cron pattern |
| [driver-photos-fallback.puml](diagrams/driver-photos-fallback.puml) | OpenF1 outage degradation flow |

## House rules (TL;DR)

These are enforced by tests, build, or code review. The authoritative source is
[AGENTS.md](../AGENTS.md) at the repo root — read it once end-to-end.

1. **TDD.** Every new fetcher / route / guard ships with at least one happy-path
   and one failure-path test. `npm test` must be green before commit.
2. **No magic TTL numbers.** Every external fetcher declares a `DataClass`; TTLs
   come from [src/lib/cacheStrategy.ts](../src/lib/cacheStrategy.ts).
3. **No hardcoded colors.** All colors come from CSS variables in
   [src/app/globals.css](../src/app/globals.css).
4. **Browser never calls third-party APIs directly.** Everything flows through
   `/api/*` routes (the CSP enforces this).
5. **Fault-tolerant pages.** Use `Promise.allSettled()` so one upstream blip
   does not blank the page.
6. **`npm run build` must pass before push** when touching `src/app/**`.

If you find anything in this guide that contradicts the code, the code wins —
please send a PR.

## Where to look next

- [docs/architecture.md](../docs/architecture.md) — deeper architectural rationale.
- [docs/HANDOFF.md](../docs/HANDOFF.md) — ongoing roadmap + recently shipped work.
- [docs/testing.md](../docs/testing.md), [docs/security.md](../docs/security.md),
  [docs/contributing.md](../docs/contributing.md), [docs/design-system.md](../docs/design-system.md).
