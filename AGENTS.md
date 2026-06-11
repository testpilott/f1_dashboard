<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Testing (TDD — mandatory before every commit)

**Test runner:** Vitest 2.x — `npm test` (runs `vitest run`)
**Test files:** co-located under `src/**/__tests__/*.test.ts`
**Existing suites:** `src/lib/__tests__/`, `src/app/api/__tests__/`

### Workflow

1. **Write tests first (or alongside).** Before implementing any new logic, add a test that covers the expected behaviour. For guard/transform patterns (e.g. `Array.isArray` guards), inline-test the pattern directly — see `src/app/api/__tests__/fetcher-guards.test.ts` as the reference style.
2. **Run the full suite before every commit.** `npm test` must exit 0. If any test fails, fix the failure — do NOT skip, comment out, or force-push past a red suite.
3. **New code = new tests.** Every new function, guard, or API transform must have at least one positive test and one edge-case/failure test.
4. **Do not commit a `git add / git commit` until `npm test` passes.**
5. **No weak assertions or dynamic fixtures.** Do not use `toBeTruthy()` for DOM queries; assert `toBeInTheDocument()`, `toHaveClass()`, or exact text/shape. Do not use `new Date()`, `Date.now()`, or `Math.random()` in fixtures/assertions unless the test freezes time with `vi.setSystemTime()`.
6. **Every new API route needs a route test.** Add a `src/app/api/__tests__/*.test.ts` file that covers invalid input (`400`), success shape (`200`), and upstream failure (`500` or documented graceful degradation).

### What to test

| Change type | What to cover |
|---|---|
| New API fetcher / transform | Valid response, `null`/`undefined` field, wrong type (object/string) |
| New utility function | Happy path + boundary/edge cases |
| New regex / validation | Accepts valid inputs, rejects invalid/injection attempts |
| Bug fix | At minimum, one regression test for the specific failure |

### What not to test

- Next.js routing itself (framework responsibility)
- External network calls — mock at the fetch boundary or test the transform in isolation
- UI rendering — no jsdom tests unless specifically needed; keep environment `node`

## API Route Guardrails

1. **Call `rateLimited(req, routeKey)` first.** It must run before validation, fetching, or any expensive work.
2. **Validate every external input.** Every query/path param must be checked against a named export from `src/lib/validators.ts` before use.
3. **Use route helpers for error responses.** Prefer `badRequest()` and `serverError()` from `src/lib/api/routeHelpers`; do not hand-roll error `NextResponse` payloads unless the route intentionally degrades with a documented alternative shape.
4. **Parallelize independent fetches.** Use `Promise.all()` for required sibling calls and `Promise.allSettled()` where partial data is acceptable.
5. **Gracefully degrade optional data.** If a source is optional, prefer a typed `{ available: false, reason }` response over an HTTP 500.
6. **Use stable route identifiers in logs.** `serverError()` names should be stable identifiers such as `compare-season`, not query-string fragments.
7. **`gracefulDegradation` vs `serverError`.** Return HTTP 200 with `{ available: false }` only when the client has a designed empty-state for optional enrichment (currently `/api/standings`, `/api/circuit-info`, `/api/race-incidents`). Return `serverError` for primary-content routes where clients branch on `!res.ok`. Do not flip existing routes between these modes without coordinated client updates.

## Cache And Timing Rules

1. **Do not scatter TTL magic numbers.** Shared timeout, stale-time, and `unstable_cache` TTL values must come from named constants in `src/lib/cacheStrategy.ts` or a dedicated timing/constants module.
2. **Segment config exports stay literal.** In route/page segment config exports (`revalidate`, `maxDuration`, `preferredRegion`, etc.), use static literal values only (for example `21600`, not `6 * 3600`).
3. **Every external fetcher must carry a `DataClass`.** If a helper wraps Jolpica/OpenF1/OpenMeteo/Wikidata-style traffic, it must accept or choose an explicit `DataClass` and pass it through to `adaptiveRevalidate()`.
4. **Document unavoidable year literals.** Any remaining hardcoded year in constants must carry a comment explaining the upstream dependency and the update trigger.

## UI And Design Rules

1. **No hardcoded colors in components.** Do not use raw hex, `rgb()/rgba()`, or Tailwind color utilities like `text-blue-400`/`bg-red-500` in app components, SVGs, or chart props. Use design tokens or theme constants.
2. **Chart and SVG colors are part of the design system.** Sector, incident, tyre, and chart series colors must come from `globals.css` variables or shared theme exports, not component-local literals.
3. **`next/image` stays the default.** Avoid raw `<img>` in product code and avoid `unoptimized` unless there is a documented, unavoidable constraint.

## Verified Good Patterns To Keep

1. **Fetcher factory:** route external HTTP wrappers through `createApiFetcher()` for consistent timeout/error behaviour.
2. **Adaptive ISR:** use `adaptiveRevalidate(dataClass)` instead of hand-picking TTLs per call site.
3. **Fault-tolerant server pages:** prefer `Promise.allSettled()` when one upstream failure should not blank a page.
4. **SSR-safe browser state:** keep using `useSyncExternalStore`-backed helpers such as `useIsClient()` / `useNow()` for browser-only state.
5. **Hoisted test mocks:** use `vi.hoisted(() => ({ mockFn: vi.fn() }))` when a mock factory needs shared references before module evaluation.
6. **Pure parser boundaries:** keep parse/normalize logic in pure helpers and keep network I/O in fetcher modules or routes.

## Deployment Safety (mandatory before pushing)

1. **Run production build locally before push.** If changes touch `src/app/**`, API routes, Next segment config exports, or chart components, run `npm run build` (not only `npm test`) and fix all build/type errors first.
2. **Segment config exports must be literals.** In route/page segment config exports (`revalidate`, `maxDuration`, `preferredRegion`, etc.), use static literal values only (for example `21600`, not `6 * 3600`). Name the bucket in a nearby comment if needed, but do not use arithmetic expressions.
3. **Do not assume third-party type exports.** For libraries like `@nivo/*`, verify available exported types in `node_modules/<pkg>/dist/types/index.d.ts` before importing named type exports.
4. **Prefer local series/types over fragile library aliases.** When generic chart typing gets strict, define a local chart data type and pass it consistently to component generics and layer props.
5. **After tool-based edits, re-read changed files before build.** If patching tools produce unexpected syntax/layout, validate by reading the full file and rerun `npm run build`.
6. **Push gate:** do not push when local `npm run build` fails, even if `npm test` is green.
