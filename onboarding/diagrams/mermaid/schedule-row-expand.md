# Schedule Row Expand — Timings vs Race Classification

Expanding a race row on `/schedule` shows different content depending on whether the race has actually run. The gate is `hasRaceFinished()` (race start + 4 h buffer, or end of the UTC race day when no start time exists) — deliberately stricter than the date-only "Done" badge check, so race-day mornings still show session timings.

```mermaid
flowchart TD
    Start([User expands a schedule row])
    Start --> Gate{hasRaceFinished?<br/>start + 4h buffer,<br/>or UTC day end w/o time}

    Gate -- no --> Sessions[SessionRow list<br/>FP1 / Quali / Sprint / Race<br/>circuit + local timezones]
    Sessions --> LinkA[Link: Race detail /<br/>View results]

    Gate -- yes --> Panel[RaceResultPanel mounts<br/>lazy — collapsed rows fetch nothing]
    Panel --> Fetch[useQuery GET /api/results?season&round<br/>staleTime 1h]
    Fetch --> State{Response?}
    State -- loading --> Skel[Skeleton rows]
    State -- error --> Err[Could not load race results.]
    State -- empty --> Lag[Results not yet available —<br/>feed lag message]
    State -- results --> Table[ResultTable type=race<br/>Pos / Driver / Constructor /<br/>Time-Status incl. DNF badges / Pts]
    Table --> LinkB[Link: Full race detail]
```

> The classification rendering is shared with the race-detail page — `RaceResultPanel` only owns the fetch + loading/error/empty states and delegates rows to [`ResultTable`](../../../src/components/race/ResultTable.tsx).

Source of truth (PlantUML): [../puml/schedule-row-expand.puml](../puml/schedule-row-expand.puml).
