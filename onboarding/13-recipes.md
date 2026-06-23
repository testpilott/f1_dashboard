# 13 — Recipes

Copy-paste templates for the things you'll do in your first month.

## Add an API route

```ts
// app/api/<route>/route.ts
import { NextRequest } from "next/server";
import { rateLimited } from "@/lib/api/withRateLimit";
import { badRequest, cachedJson, serverError } from "@/lib/api/routeHelpers";
import { VALID_YEAR } from "@/lib/validators";
import { getDriverStandings } from "@/lib/api/jolpica";

export const revalidate = 3600; // literal — see cacheStrategy.ts

export async function GET(req: NextRequest) {
  const blocked = rateLimited(req, "example");
  if (blocked) return blocked;

  const year = req.nextUrl.searchParams.get("year");
  if (!VALID_YEAR.test(year ?? "")) return badRequest("Invalid year");

  try {
    const drivers = await getDriverStandings(year ?? "current");
    return cachedJson({ drivers }, "liveStandings");
  } catch (err) {
    return serverError("example", err);
  }
}
```

And its test:

```ts
// app/api/__tests__/<route>.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/example/route";
import { makeApiRequest } from "@/test/makeApiRequest";

const { mockGetDriverStandings } = vi.hoisted(() => ({
  mockGetDriverStandings: vi.fn(),
}));

vi.mock("@/lib/api/jolpica", () => ({
  getDriverStandings: mockGetDriverStandings,
}));

describe("/api/example", () => {
  beforeEach(() => vi.resetAllMocks());

  it("400s on invalid year", async () => {
    const res = await GET(makeApiRequest("http://x/api/example?year=NaN"));
    expect(res.status).toBe(400);
  });

  it("200s with shape", async () => {
    mockGetDriverStandings.mockResolvedValueOnce([{ position: "1" }]);
    const res = await GET(makeApiRequest("http://x/api/example?year=2024"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ drivers: expect.any(Array) });
  });

  it("500s on upstream failure", async () => {
    mockGetDriverStandings.mockRejectedValueOnce(new Error("boom"));
    const res = await GET(makeApiRequest("http://x/api/example?year=2024"));
    expect(res.status).toBe(500);
  });
});
```

## Add an upstream fetcher

If a new external API joins (rare):

```ts
// lib/api/<service>.ts
import { createApiFetcher } from "@/lib/api/createApiFetcher";
import { adaptiveRevalidate, type DataClass } from "@/lib/cacheStrategy";

const newapiFetch = createApiFetcher("https://api.example.com/v1", "newapi");

export async function fetchNewapi<T>(path: string, dataClass: DataClass): Promise<T> {
  return newapiFetch<T>(path, adaptiveRevalidate(dataClass));
}
```

If the upstream has tighter rate limits, lower the concurrency cap:

```ts
const newapiFetch = createApiFetcher(base, "newapi", /* maxConcurrent */ 1);
```

Don't forget:

- Tests for the parser/normaliser (if any).
- Add the host to `next.config.ts` `images.remotePatterns` (if images).
- Add the host to the CSP allow-list (if direct browser fetch — but we don't
  do that; everything goes via `/api/*`).

## Add a validator

```ts
// src/lib/validators.ts
const SESSION_KEY_RE = /^[a-z0-9_-]{1,40}$/i;
export function validateSessionKey(v: string | null | undefined): v is string {
  return typeof v === "string" && SESSION_KEY_RE.test(v);
}
```

And add route-level assertions in `src/app/api/__tests__/validation.test.ts`:

```ts
it("accepts valid keys", () => {
  expect(validateSessionKey("2024_bahrain_R")).toBe(true);
});
it("rejects path traversal", () => {
  expect(validateSessionKey("../../etc/passwd")).toBe(false);
});
```

## Add a stat / pure computation

```ts
// src/lib/stats/<feature>.ts
export function computeQualiGap(rows: QualiRow[]): number | null {
  const [p1, p2] = rows.slice(0, 2);
  if (!p1?.timeMs || !p2?.timeMs) return null;
  return p2.timeMs - p1.timeMs;
}
```

Tests:

```ts
it("returns positive gap when P1 faster", () => {
  expect(computeQualiGap([{ timeMs: 80000 }, { timeMs: 80350 }])).toBe(350);
});
it("returns null when P2 has no time", () => {
  expect(computeQualiGap([{ timeMs: 80000 }, { timeMs: null }])).toBeNull();
});
```

Wire into a route only after the function is green.

## Add a page

```tsx
// app/<page>/page.tsx
import { Suspense } from "react";
import { FooClient } from "./FooClient";

async function fetchData() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/foo?year=2025`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return { items: [] };
  return res.json();
}

export default async function Page() {
  const [initial] = await Promise.allSettled([fetchData()]);
  const data = initial.status === "fulfilled" ? initial.value : { items: [] };
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <FooClient initialData={data} />
    </Suspense>
  );
}
```

## Add a client component with React Query

```tsx
// app/<page>/FooClient.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/clientFetch";

export function FooClient({ initialData }: { initialData: Foo }) {
  const { data } = useQuery({
    queryKey: ["foo", 2025],
    queryFn: () => fetchJson<Foo>("/api/foo?year=2025"),
    initialData,
    staleTime: 60 * 60 * 1000,
  });
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
```

## Add a cron

1. In [vercel.json](../vercel.json):
   ```json
   { "path": "/api/things/snapshot", "schedule": "0 7 * * *" }
   ```
2. In the route, check `CRON_SECRET`:
   ```ts
   const auth = req.headers.get("authorization");
   if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
     return new NextResponse("Unauthorized", { status: 401 });
   }
   ```
3. Have it bump or rewrite the `unstable_cache` entry it produces.
4. Document the cadence in [12-deployment.md](12-deployment.md).

## Bump a cache key

When the *shape* of a cached payload changes:

```ts
// before
unstable_cache(fn, ["driver-photos-v3-monthly"], { revalidate: ... });
// after
unstable_cache(fn, ["driver-photos-v4-monthly"], { revalidate: ... });
```

Bump the version segment, not the whole key. Add a one-line comment noting
what changed and the date. Next deploy will store a fresh row.

## Graceful-degradation pattern

When an upstream is optional:

```ts
try {
  const photos = await fetchOpenF1Photos();
  return NextResponse.json({ available: true, photos });
} catch (err) {
  return NextResponse.json({ available: false, reason: "openf1-unavailable" });
}
```

The page treats `available: false` as a known state and renders a fallback.
Don't surface this as a 500 — the route succeeded, the data didn't.

## Add a new circuit to the curated details table

When a new circuit joins the F1 calendar (or you want to backfill an existing
unseeded one):

1. Look up the Jolpica `circuitId` in `data/snapshots/schedule-current.json`
   (`jq '.races[].Circuit.circuitId' data/snapshots/schedule-current.json | sort -u`).
2. Open the circuit's Wikipedia article and capture **length (m)**, **turn
   count**, **direction** (clockwise / anticlockwise), and the **slug** (the
   underscored part after `/wiki/`). Store the slug as raw UTF-8 — the helper
   percent-encodes it via `encodeURI`.
3. From the article body or FIA homologation PDF, capture **elevation gain
   (m)** (peak-to-low) and **max banking (°)**. Use `0` for flat circuits.
4. Pick 3–6 well-known corners; write a ≤140-character description per
   hotspot (the test enforces the limit).
5. **Verify each hotspot's `corner` number** against Multiviewer's geometry
   by running `npm run dev`, opening `/race/<year>/<round>` for that circuit's
   race, and clicking the corresponding corner button — the highlighted turn
   should match the name you wrote. Multiviewer's numbering occasionally
   diverges from fan convention on chicane-heavy layouts.
6. Add the entry to `CIRCUIT_DETAILS` in
   `src/lib/constants/circuitDetails.ts`.
7. Run `npm test`. The data-driven sanity checks in
   `circuitDetails.test.ts` catch typos (corner number > 1.5× turn count,
   description too long, spaces in slug, missing fields).
8. Commit: `feat(constants): seed circuit-details for <circuitId>`.

## Common pitfalls

| Pitfall | Fix |
|---|---|
| `6 * 3600` in segment config | Use a literal `21600` and put the math in a comment |
| `text-blue-500` in JSX | Replace with `text-[color:var(--color-team-X)]` |
| Calling `fetch("https://api.jolpi.ca/...")` from a page | Wrap in `fetchJolpica`, call our `/api/*` |
| `new Date()` in a test | `vi.useFakeTimers(); vi.setSystemTime(new Date("2025-01-01"))` |
| Missing `validateX` on a query param | Add it; add a rejection test |
| Hardcoded TTL number in a route | Use `adaptiveRevalidate(dataClass)` |
| Forgetting `rateLimited` | Add it as the first line of the handler |
| Storing a Wikipedia slug already percent-encoded | Store raw UTF-8; let `encodeURI` do the encoding |
| Hotspot `corner` not matching Multiviewer | Click the corner in the dev-server Circuit tab to verify before merging |

## Where to ask for help

1. Search [docs/HANDOFF.md](../docs/HANDOFF.md) for recent decisions
2. Search [AGENTS.md](../AGENTS.md) for the rule you want to bend
3. Read the closest existing route as a reference
4. Ask in PR comments

That's the tour. Welcome to the team.
