# 13 — Recipes

Copy-paste templates for the things you'll do in your first month.

## Add an API route

```ts
// src/app/api/foo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { rateLimited } from "@/lib/api/withRateLimit";
import { badRequest, serverError } from "@/lib/api/routeHelpers";
import { validateYear } from "@/lib/validators";
import { adaptiveRevalidate } from "@/lib/cacheStrategy";
import { fetchJolpica } from "@/lib/api/jolpica";

export const revalidate = 3600; // literal — see cacheStrategy.ts

export async function GET(req: NextRequest) {
  const limited = rateLimited(req, "foo");
  if (limited) return limited;

  const year = req.nextUrl.searchParams.get("year");
  if (!validateYear(year)) return badRequest("Invalid year");

  try {
    const data = await fetchJolpica<MyShape>(`whatever/${year}.json`, "seasonSchedule");
    return NextResponse.json(
      { items: data.MRData.something },
      { headers: { "Cache-Control": `s-maxage=${adaptiveRevalidate("seasonSchedule")}` } },
    );
  } catch (err) {
    return serverError(err, "foo");
  }
}
```

And its test:

```ts
// src/app/api/__tests__/foo.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/foo/route";
import { makeApiRequest } from "@/test/makeApiRequest";

vi.mock("@/lib/api/jolpica");
import { fetchJolpica } from "@/lib/api/jolpica";

describe("/api/foo", () => {
  beforeEach(() => vi.resetAllMocks());

  it("400s on invalid year", async () => {
    const res = await GET(makeApiRequest("http://x/api/foo?year=NaN"));
    expect(res.status).toBe(400);
  });

  it("200s with shape", async () => {
    vi.mocked(fetchJolpica).mockResolvedValueOnce({ MRData: { something: [1, 2] } });
    const res = await GET(makeApiRequest("http://x/api/foo?year=2024"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ items: [1, 2] });
  });

  it("500s on upstream failure", async () => {
    vi.mocked(fetchJolpica).mockRejectedValueOnce(new Error("boom"));
    const res = await GET(makeApiRequest("http://x/api/foo?year=2024"));
    expect(res.status).toBe(500);
  });
});
```

## Add an upstream fetcher

If a new external API joins (rare):

```ts
// src/lib/api/newapi.ts
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

And its test (`src/lib/__tests__/validators.test.ts`):

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
// src/lib/stats/quali.ts
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
// src/app/foo/page.tsx
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
// src/app/foo/FooClient.tsx
"use client";
import { useQuery } from "@tanstack/react-query";

export function FooClient({ initialData }: { initialData: Foo }) {
  const { data } = useQuery({
    queryKey: ["foo", 2025],
    queryFn: () => fetch("/api/foo?year=2025").then(r => r.json()),
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

## Where to ask for help

1. Search [docs/HANDOFF.md](../docs/HANDOFF.md) for recent decisions
2. Search [AGENTS.md](../AGENTS.md) for the rule you want to bend
3. Read the closest existing route as a reference
4. Ask in PR comments

That's the tour. Welcome to the team.
