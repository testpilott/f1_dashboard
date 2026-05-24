# System Context

F1 Dashboard — System Context. Browser talks only to Next.js (same-origin); the app server fans out to free public APIs and caches results.

```mermaid
flowchart LR
    User([User<br/>Browser])

    subgraph Vercel["Vercel Edge / Node"]
        App["Next.js App Router"]
        Cache[("Vercel Data Cache<br/>unstable_cache + ISR")]
        Cron["Vercel Cron"]
    end

    subgraph Upstreams["Free public APIs"]
        Jolpica["Jolpica (Ergast)"]
        OpenF1["OpenF1"]
        MV["MultiViewer"]
        Meteo["Open-Meteo"]
        WD["Wikidata"]
        RSS["RSS feeds"]
    end

    User -- "same-origin<br/>GET /, /api/*" --> App
    App -- "hit?" --> Cache
    Cache -- "cached JSON" --> App
    App -- "miss" --> Jolpica
    App -- "miss" --> OpenF1
    App -- "miss" --> MV
    App -- "miss" --> Meteo
    App -- "miss" --> WD
    App -- "miss" --> RSS
    Cron -- "POST .../snapshot<br/>Bearer CRON_SECRET" --> App
```

> CSP: `connect-src 'self'`. The browser never calls upstreams directly.

Source of truth (PlantUML): [../puml/system-context.puml](../puml/system-context.puml).
