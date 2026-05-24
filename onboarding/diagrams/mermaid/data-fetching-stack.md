# Data Fetching Stack — `createApiFetcher`

Per-upstream wrappers compose retry, concurrency, timeout, and Next.js caching layers.

```mermaid
flowchart TD
    subgraph Wrappers["Per-upstream wrapper<br/>(jolpica.ts, openf1.ts, …)"]
        Wrapper["fetchJolpica(path, dataClass)"]
    end

    subgraph Factory["createApiFetcher"]
        Retry["withRetry<br/>(≤3 attempts, jittered)"]
        Limiter["concurrencyLimiter<br/>(cap = 2 per service)"]
        Timeout["fetchWithTimeout<br/>(AbortController, 8s)"]
    end

    subgraph Next["Next.js"]
        NextCache["fetch.next.revalidate<br/>(Data Cache)"]
        UnstableCache["unstable_cache<br/>(route-level computed)"]
    end

    Upstream(["Upstream API"])

    Wrapper -- "path, adaptiveRevalidate(dataClass)" --> Retry
    Retry -- "acquire / release" --> Limiter
    Limiter --> Timeout
    Timeout -- "with next.revalidate" --> NextCache
    NextCache -- "on miss" --> Upstream
    Upstream -- "200 JSON" --> NextCache
    NextCache -- "cached/fresh" --> Timeout
    Timeout --> Limiter
    Limiter --> Retry
    Retry --> Wrapper

    UnstableCache -. "routes wrap<br/>expensive computations" .-> Wrapper
```

- **Retries on:** network error, HTTP 429 / 5xx, timeout.
- **Default cap = 2.** Lower in `createApiFetcher(base, name, 1)` for stricter upstreams.

Source of truth (PlantUML): [../puml/data-fetching-stack.puml](../puml/data-fetching-stack.puml).
