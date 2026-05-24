# Projections — Cron-driven Monte Carlo Snapshot

Vercel Cron warms a cached snapshot daily; user requests just read it.

```mermaid
sequenceDiagram
    actor Cron as Vercel Cron<br/>(daily 06:00 UTC)
    participant Snap as /api/projections/snapshot
    participant Sim as runMonteCarlo()<br/>src/lib/projections
    participant Cache as unstable_cache
    actor User as User browser
    participant Get as /api/projections (GET)
    participant Page as /projections page

    Cron->>Snap: POST<br/>Authorization: Bearer CRON_SECRET
    activate Snap
    Snap->>Snap: verify bearer token
    Snap->>Sim: simulate(standings, paceDist,<br/>N = 10,000, seededRng)
    activate Sim
    Sim-->>Snap: ProjectionSnapshot<br/>{ probabilities, generatedAt }
    deactivate Sim
    Snap->>Cache: store ["projections-vN", weekBucket]<br/>revalidate: adaptiveRevalidate("projectionSnapshot")
    Snap-->>Cron: 200 OK
    deactivate Snap

    Note over User,Page: later, on user request

    User->>Page: GET /projections
    Page->>Get: fetch /api/projections
    Get->>Cache: read snapshot
    alt warm
        Cache-->>Get: ProjectionSnapshot
        Get-->>Page: JSON
        Page-->>User: rendered probabilities
    else cold (first deploy / schema bump)
        Cache-->>Get: (none)
        Get-->>Page: { available: false,<br/>reason: "no-snapshot" }
        Page-->>User: friendly "warming up" UI
    end

    Note over Cache: Bump key version (vN → vN+1)<br/>whenever the snapshot shape changes.<br/>Next cron run warms the new row.
```

Source of truth (PlantUML): [../puml/projections-cron.puml](../puml/projections-cron.puml).
