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
