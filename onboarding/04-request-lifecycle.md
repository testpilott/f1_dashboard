# 04 — Request Lifecycle

Two paths matter: a **page load** (SSR) and an **API route call**
(server-internal or client-driven). They share the same data-fetching stack but
arrive there from different places.

## A) Loading a page (SSR)

Example: `GET /standings`.

```mermaid
sequenceDiagram
    actor U as Browser
    participant N as Next.js (Edge/Node)
    participant P as page.tsx (RSC)
    participant API as /api/standings/...
    participant L as Concurrency Limiter
    participant FU as Upstream (Jolpica)
    participant C as Vercel Data Cache

    U->>N: GET /standings
    N->>P: render Server Component
    P->>API: fetch (same-origin) ×N (Promise.allSettled)
    API->>C: cache lookup (unstable_cache key)
    alt hit
        C-->>API: cached JSON
    else miss
        API->>L: acquire (cap=2)
        L->>FU: fetch (8s timeout, ≤3 retries)
        FU-->>L: JSON
        L-->>API: JSON
        API->>C: store with adaptiveRevalidate(DataClass)
    end
    API-->>P: JSON
    P-->>N: streamed HTML
    N-->>U: HTML + hydrate
```

PlantUML: [diagrams/request-lifecycle-page.puml](diagrams/request-lifecycle-page.puml).

Key points:

- Server components fetch via **same-origin `/api/*`**, not by importing the
  fetcher directly. This keeps a single contract and lets the browser, RSC, and
  cron all share one entry point.
- They use `Promise.allSettled()` so a single 500 doesn't blank the page.
- The `loading.tsx` skeleton streams while RSCs run.
- After hydration, client components (e.g. live telemetry) take over via React
  Query.

## B) Calling an API route

Every route follows the same skeleton.

```mermaid
sequenceDiagram
    participant Caller as Caller (Page / Browser / Cron)
    participant Route as Route Handler
    participant RL as rateLimited
    participant V as validators
    participant H as Helpers (jolpica/openf1/…)
    participant L as Limiter
    participant R as withRetry
    participant T as fetchWithTimeout
    participant UP as Upstream

    Caller->>Route: GET /api/...?year=2025
    Route->>RL: check IP window
    alt over limit
        RL-->>Route: 429
        Route-->>Caller: 429 JSON
    end
    Route->>V: validateYear("2025")
    alt invalid
        V-->>Route: false
        Route-->>Caller: 400 badRequest()
    end
    Route->>H: fetch + parse
    H->>L: acquire (per service)
    L->>R: withRetry(...)
    loop up to 3 attempts
        R->>T: fetchWithTimeout (8s)
        T->>UP: GET
        alt success
            UP-->>T: 200 JSON
        else 5xx / network
            UP-->>T: error
            T-->>R: throw
            R->>R: jittered backoff
        end
    end
    R-->>H: JSON or throw
    H-->>Route: typed payload
    Route-->>Caller: 200 JSON  // or 500 serverError("route-key")
```

PlantUML: [diagrams/request-lifecycle-api.puml](diagrams/request-lifecycle-api.puml).

Authoritative skeleton (copy from [13-recipes.md](13-recipes.md)):

```ts
// src/app/api/example/route.ts
import { NextRequest, NextResponse } from "next/server";
import { rateLimited } from "@/lib/api/withRateLimit";
import { badRequest, serverError } from "@/lib/api/routeHelpers";
import { validateYear } from "@/lib/validators";
import { adaptiveRevalidate } from "@/lib/cacheStrategy";

export const revalidate = 21600; // see cacheStrategy.ts for the literal

export async function GET(req: NextRequest) {
  const limited = rateLimited(req, "example");
  if (limited) return limited;

  const year = req.nextUrl.searchParams.get("year");
  if (!validateYear(year)) return badRequest("Invalid year");

  try {
    const data = await fetchExample(year!); // wraps createApiFetcher
    return NextResponse.json(data, {
      headers: { "Cache-Control": `s-maxage=${adaptiveRevalidate("seasonSchedule")}` },
    });
  } catch (err) {
    return serverError(err, "example");
  }
}
```

Why this order matters:

- **Rate limit first** so abusive clients never reach the upstream API.
- **Validate next** so we never forward garbage to Jolpica/OpenF1.
- **Try / catch with stable identifier** so logs are grep-able
  (`serverError(err, "compare-season")` not `"/api/compare?year=2025…"`).
- **Headers last** so we attach the right `s-maxage` even if it's served from a
  warm cache hit.

## Client-side fetches

Client components use React Query keyed by URL. Defaults are set in
[providers.tsx](../src/components/providers.tsx):

- `staleTime`: 2 minutes (data class can override per-query)
- `gcTime`: 10 minutes
- `retry`: 1
- `refetchOnWindowFocus`: false

Live components override `staleTime` and pass `refetchInterval` for telemetry.
See [05-data-fetching.md](05-data-fetching.md).

Next: [05 — Data Fetching Layer](05-data-fetching.md).
