# Request Lifecycle — Page (SSR)

How a server-rendered page resolves data through the API layer and Vercel Data Cache.

```mermaid
sequenceDiagram
    actor Browser
    participant N as Next.js Server
    participant P as page.tsx (RSC)
    participant R as /api/... (route)
    participant C as Vercel Data Cache
    participant L as Concurrency Limiter
    participant U as Upstream<br/>(Jolpica/OpenF1/…)

    Browser->>N: GET /standings
    activate N
    N->>P: render server component
    activate P
    P->>R: fetch /api/standings<br/>(Promise.allSettled × N)
    activate R
    R->>C: lookup cache key
    alt cache hit
        C-->>R: cached JSON
    else cache miss
        R->>L: acquire (cap=2)
        L->>U: fetch (8s timeout, ≤3 retries)
        U-->>L: JSON
        L-->>R: JSON
        R->>C: store w/ adaptiveRevalidate(DataClass)
    end
    R-->>P: JSON
    deactivate R
    P-->>N: streamed HTML
    deactivate P
    N-->>Browser: HTML + hydrate
    deactivate N

    Note over Browser,N: loading.tsx streams a skeleton<br/>while RSCs are still working.
```

Source of truth (PlantUML): [../puml/request-lifecycle-page.puml](../puml/request-lifecycle-page.puml).
