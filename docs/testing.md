# Testing Guide

> **TL;DR** — TDD is mandatory. Write the test first (or alongside), run `npm test`
> (must exit 0) before every commit. Logic/API tests run in **Node**; component tests
> run in **jsdom**. Mock at the fetch boundary — never hit the real network, never test
> Next.js routing itself.

## Commands

```bash
npm test            # run everything once (both projects)
npm run test:watch  # watch mode
npm run test:ci     # run + enforce coverage thresholds (used in CI / pre-push)
```

## Two test projects

We use two Vitest projects so server logic and React components run in the right
environment:

| Project | Environment | Includes | Coverage scope |
|---|---|---|---|
| `node` | `node` | `src/lib/**/__tests__/*.test.ts`, `src/app/api/**/__tests__/*.test.ts` | `src/lib/**/*.ts` |
| `dom`  | `jsdom` | `src/components/**/__tests__/*.test.tsx`, `src/app/**/__tests__/*.test.tsx` | `src/components/**` |

- File extension convention: **`.test.ts`** for node logic, **`.test.tsx`** for
  component (jsdom) tests. The project an file belongs to is decided by its path/glob.
- `vitest.setup.ts` registers `@testing-library/jest-dom` matchers for the `dom` project.

## Writing a logic test (node)

Co-locate under `src/lib/<area>/__tests__/`. Cover happy path **and** an edge/failure.
For guard/transform patterns, inline-test the pattern directly — see
`src/app/api/__tests__/fetcher-guards.test.ts` as the reference style.

## Writing a component test (jsdom)

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Navbar from "@/components/layout/Navbar";

it("marks the active route", () => {
  render(<Navbar />);                       // mock next/navigation if needed
  expect(screen.getByRole("navigation")).toBeInTheDocument();
});
```

- Mock data at the **fetch / React Query boundary** (e.g. wrap in a `QueryClientProvider`
  with seeded cache, or mock the fetcher module). Do not perform real network calls.
- For pages, test the **client component**, not the server `page.tsx` routing.

## Coverage gate

Thresholds live in `vitest.config.ts` under `coverage.thresholds`. Coverage is scoped to
`src/lib/**/*.ts` (business logic and API layer). Components are verified via behavioural
jsdom tests rather than line coverage.

| Scope | Phase 0 gate | Final (Phase 5) gate |
|---|---|---|
| `src/lib/**` (logic/API) | 70% lines/branches/functions | **lines/statements/functions 80%, branches 75%** |

Pure type files (`src/lib/types/**`, `src/lib/types.ts`) and external API fetchers
(`jolpica.ts`, `openf1.ts`, `openmeteo.ts`, `rss.ts`) are excluded from coverage — they
have no executable logic to measure.

`npm run test:ci` fails the build if coverage drops below the gate. Raise tests, don't
lower the gate.

## What NOT to test

- Next.js routing/framework internals.
- Real external network calls (mock at the boundary).
- Pure visual rendering pixels (assert structure/roles/text, not styles).

## Test Smells To Avoid

| Smell | Why it is bad | What to do instead |
|---|---|---|
| `toBeTruthy()` on a DOM query | Hides what actually failed and can pass for the wrong reason | Use `toBeInTheDocument()`, `toHaveTextContent()`, `toHaveClass()`, or explicit shape assertions |
| `new Date()`, `Date.now()`, `Math.random()` in fixtures/assertions | Makes tests non-deterministic and year-rollover prone | Use fixed literals or `vi.useFakeTimers()` + `vi.setSystemTime()` |
| API route with only a happy-path test | Misses the real breakpoints: validation and upstream failure | Cover `400` invalid input, `200` success shape, and `500`/documented graceful degradation |
| Mocking the function under test | Verifies the mock, not the code | Mock only the dependency boundary (fetcher/module) and assert the function/route output |
| Real network access in tests | Flaky, slow, and violates repo policy | Mock at the fetch boundary or test the pure transform directly |

## Definition of Done for any change

1. New/changed code has ≥ 1 positive test and ≥ 1 edge/failure test.
2. `npm test` exits 0.
3. Coverage gate (`npm run test:ci`) passes.
