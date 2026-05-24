# Driver Photos — Graceful Degradation

Even on a total OpenF1 outage, the route returns 200 with a usable payload.

```mermaid
sequenceDiagram
    actor User
    participant Page as /drivers page
    participant Route as /api/driver-photos
    participant Cache as unstable_cache<br/>[driver-photos-v4-monthly]
    participant OpenF1 as fetchOpenF1Photos()
    participant LKG as lastKnownGoodPhotos<br/>(module-scoped)
    participant HS as DriverHeadshot component

    User->>Page: GET /drivers
    Page->>Route: GET /api/driver-photos
    activate Route
    Route->>Cache: read
    alt cache hit
        Cache-->>Route: photos[]
    else cache miss
        Cache->>OpenF1: GET (8s timeout, retries)
        alt OpenF1 OK
            OpenF1-->>Cache: photos[]
            Cache->>LKG: update module variable
        else OpenF1 5xx / paywalled (live FOM session)
            OpenF1-->>Cache: error
            Cache->>LKG: read fallback
            alt have last-known-good
                LKG-->>Cache: previous photos[]
            else cold start
                LKG-->>Cache: []
            end
        end
        Cache-->>Route: photos[]
    end
    Route-->>Page: { photos }
    deactivate Route

    loop per driver
        Page->>HS: render with photo URL or null
        alt photo URL present
            HS-->>User: img src="…openf1…"
        else missing
            HS-->>User: team-coloured silhouette<br/>(public/logos/…)
        end
    end

    Note right of Route: Even on total OpenF1 outage,<br/>the route always returns 200<br/>with a graceful payload.<br/>No 500 reaches the page.
```

Source of truth (PlantUML): [../puml/driver-photos-fallback.puml](../puml/driver-photos-fallback.puml).
