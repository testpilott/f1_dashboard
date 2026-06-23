# 11 — Testing

Testing is mandatory. `npm test` must exit 0 before every commit. The full
policy is in [AGENTS.md](../AGENTS.md) and [docs/testing.md](../docs/testing.md);
this chapter is the practical "how to write a test in this project" guide.

## The runner

[vitest.config.ts](../vitest.config.ts) configures Vitest 2.x with:

- `environment: "node"` by default
- `environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]]` — TSX tests run in jsdom
- `coverage.thresholds.lines/functions/statements: 80`
- `coverage.thresholds.branches: 75`
- `setupFiles: ["./vitest.setup.ts"]` — DOM polyfills (ResizeObserver, etc.)

## Scripts

```bash
npm test               # vitest run — used by CI and pre-commit
npm run test:watch     # vitest watch
npx vitest run path/to/file.test.ts          # single file
npx vitest run --coverage                    # coverage report
```

## Where tests live

Tests are **co-located** with the code they exercise:

| Code | Tests |
|---|---|
| `src/lib/stats/form.ts` | `src/lib/stats/__tests__/form.test.ts` |
| `src/lib/race/markers.ts` | `src/lib/race/__tests__/markers.test.ts` |
| `src/lib/api/createApiFetcher.ts` | `src/lib/api/__tests__/createApiFetcher.test.ts` |
| `src/app/api/standings/route.ts` | `src/app/api/__tests__/standings.test.ts` |
| `src/components/drivers/DriverDetailPanel.tsx` | `src/components/drivers/__tests__/DriverDetailPanel.test.tsx` |

## Three patterns

### 1) Pure library test

```ts
import { describe, expect, it } from "vitest";
import { calculateDriverForm } from "@/lib/stats/form";

describe("calculateDriverForm", () => {
  it("returns neutral shape for empty races", () => {
    expect(calculateDriverForm([], "max_verstappen")).toMatchObject({
      races: 0,
      trend: "flat",
    });
  });

  it("returns neutral shape for unknown driver", () => {
    expect(calculateDriverForm(fullSeasonFixture, "not_present").races).toBe(0);
  });
});
```

No fetch, no mocks. Cover happy path + one edge + one malformed input.

The `src/lib/race/__tests__/` files are canonical examples of this pattern applied
to extracted component helpers (geometry maths, marker builders, sector helpers):

```ts
// src/lib/race/__tests__/markers.test.ts
import { buildIncidentMarkers } from "@/lib/race/markers";

it("drops incidents missing a track coordinate", () => {
  const markers = buildIncidentMarkers({
    available: true,
    incidents: [{ x: null, y: 5, ... }, { x: 50, y: 50, ... }],
  });
  expect(markers).toHaveLength(1); // the row with no x is dropped
});
```

### 2) Route test

Use the `makeApiRequest` helper:

```ts
// src/app/api/__tests__/standings.test.ts
import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/standings/route";
import { makeApiRequest } from "@/test/makeApiRequest";

const { mockGetDriverStandings, mockGetConstructorStandings } = vi.hoisted(() => ({
  mockGetDriverStandings: vi.fn(),
  mockGetConstructorStandings: vi.fn(),
}));

vi.mock("@/lib/api/jolpica", () => ({
  getDriverStandings: mockGetDriverStandings,
  getConstructorStandings: mockGetConstructorStandings,
}));

it("400s on invalid year", async () => {
  const res = await GET(makeApiRequest("http://x/api/standings?year=foo"));
  expect(res.status).toBe(400);
});

it("200s with normalized shape", async () => {
  const res = await GET(makeApiRequest("http://x/api/standings?year=2024"));
  expect(res.status).toBe(200);
  await expect(res.json()).resolves.toMatchObject({ drivers: expect.any(Array) });
});

it("500s when upstream throws", async () => {
  mockGetDriverStandings.mockRejectedValueOnce(new Error("upstream"));
  const res = await GET(makeApiRequest("http://x/api/standings?year=2024"));
  expect(res.status).toBe(200); // standings route degrades gracefully
});
```

Mock at the **fetcher boundary** (`fetchJolpica`), not at `global.fetch`. Tests
become readable and don't depend on URL/header trivia.

### 3) Component test (jsdom)

```tsx
// src/components/standings/__tests__/FormChip.test.tsx
import { render, screen } from "@testing-library/react";
import FormChip from "@/components/standings/FormChip";

it("renders placeholder when form is missing", () => {
  render(<FormChip form={undefined} />);
  expect(screen.getByText("—")).toBeInTheDocument();
});
```

Filename ends in `.test.tsx` so it picks up the jsdom environment.

## Mocking rules

| Use | When |
|---|---|
| `vi.mock("@/lib/api/xxx")` | Mock the fetcher, not `fetch` |
| `vi.hoisted(() => ({ mockFn: vi.fn() }))` | When the mock factory needs a shared reference |
| `vi.useFakeTimers()` + `vi.setSystemTime()` | Anything time-sensitive |
| `vi.spyOn(...)` | One-off behavioural override |

Don't:

- Use `new Date()`, `Date.now()`, or `Math.random()` in fixtures unless you've
  frozen time.
- Use `toBeTruthy()` for DOM queries — assert exact shape
  (`toBeInTheDocument()`, `toHaveTextContent("…")`).
- Hit real network. Mock at the fetcher boundary.

## Coverage gates

CI fails if any of these drop below threshold (project-wide):

| Metric | Threshold |
|---|---|
| Lines | 80% |
| Functions | 80% |
| Statements | 80% |
| Branches | 75% |

If you can't reach the gate for an unavoidable reason (e.g. a wrapper around a
3rd-party type guard), add an `/* v8 ignore next */` comment with a one-line
rationale.

## Special fixtures

- **Hoisted mocks for module-scoped state**:

  ```ts
  const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));
  vi.mock("@/lib/api/openf1", () => ({ openf1Fetch: mockFetch }));
  ```
- **Resetting module-scoped state**: routes that hold `let lastKnownGood = ...`
  export a `_resetXxxState()` helper for tests to call in `beforeEach`.
- **`Promise.allSettled` paths**: cover both partial-failure and full-success
  cases.

## What we don't test

| Skip | Why |
|---|---|
| Next.js routing internals | Framework responsibility |
| Real network calls | Flaky; not our code |
| Full-page jsdom renders | Slow; happens to test framework guarantees |
| Static type errors | TS already catches them at build |

## Pre-commit gate

The agent rules require:

1. `npm test` exits 0.
2. New code has at least one happy-path + one failure/edge test.
3. If you touched `src/app/**`, `npm run build` also passes.

Skipping or commenting out a failing test is never the answer. Fix the test or
the code.

Next: [12 — Deployment](12-deployment.md).
