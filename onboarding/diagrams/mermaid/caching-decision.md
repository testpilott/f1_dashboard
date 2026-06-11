# Caching Decision — Picking a TTL

Routes never hardcode TTLs. They pass a `DataClass` to `adaptiveRevalidate()`, which factors in the race-weekend window.

```mermaid
flowchart TD
    Start([Fetch needed by route or page])
    Start --> Class[Caller passes a DataClass]
    Class --> Which{Which tier?}

    Which -- live-session --> T1[liveTelemetry]
    Which -- live-meta --> T2[liveStandings / liveResults / liveIncidents]
    Which -- daily --> T3[weather / socialBio / newsFeed / recentForm]
    Which -- weekly --> T4[careerStats / driverProfile /<br/>circuitRecords / projectionSnapshot]
    Which -- seasonal --> T5[seasonSchedule / teams / circuitMeta]
    Which -- ttl-preserving --> T6[historicalResults / raceSchedule /<br/>sessionTelemetry / projectionCompute]

    T1 --> Adapt[adaptiveRevalidate dataClass]
    T2 --> Adapt
    T3 --> Adapt
    T4 --> Adapt
    T5 --> Adapt
    T6 --> Adapt

    Adapt --> Weekend{isRaceWeekend now?<br/>Fri/Sat/Sun}
    Weekend -- yes --> TTLA[Race-weekend TTL<br/>tighter, e.g. 5–60s for live tiers]
    Weekend -- no --> TTLB[Base TTL<br/>e.g. 5–60min for live tiers]

    TTLA --> Apply[Apply to fetch.next.revalidate<br/>+ unstable_cache.revalidate]
    TTLB --> Apply
    Apply --> Stop([done])
```

> All TTLs declared in `src/lib/cacheStrategy.ts`. No raw numbers in routes.

Source of truth (PlantUML): [../puml/caching-decision.puml](../puml/caching-decision.puml).
