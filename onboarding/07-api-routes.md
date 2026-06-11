# 07 — API Routes Catalog

Every server endpoint lives under [src/app/api/](../src/app/api/). Each route is
a single `route.ts` file that follows the same skeleton:

1. `rateLimited(req, routeKey)` — bail if over the window
2. Validate every input via [validators.ts](../src/lib/validators.ts)
3. Call an `src/lib/api/*` fetcher (which calls `createApiFetcher`)
4. Return `cachedJson(...)` on every cache-eligible 200-OK JSON success path,
  with a DataClass-backed `Cache-Control` header, or `badRequest()` /
  `serverError()` / `gracefulDegradation()` from
  [routeHelpers.ts](../src/lib/api/routeHelpers.ts)

The complete inventory:

| Route | Source | Upstream(s) | DataClass | Notes |
|---|---|---|---|---|
| `/api/standings` | [standings/](../src/app/api/standings/) | Jolpica | `liveStandings` | Drivers + constructors |
| `/api/schedule` | [schedule/](../src/app/api/schedule/) | Jolpica | `seasonSchedule` | Year-scoped calendar |
| `/api/results` | [results/](../src/app/api/results/) | Jolpica | `liveResults` | Race results |
| `/api/race-laps` | [race-laps/](../src/app/api/race-laps/) | Jolpica + OpenF1 | `liveResults` | Per-driver lap data |
| `/api/race-incidents` | [race-incidents/](../src/app/api/race-incidents/) | MultiViewer / OpenF1 | `liveIncidents` | Race-control events |
| `/api/sessions` | [sessions/](../src/app/api/sessions/) | OpenF1 | `liveResults` | Sessions for a meeting |
| `/api/telemetry` | [telemetry/](../src/app/api/telemetry/) | OpenF1 | `liveTelemetry` | Live position deltas |
| `/api/team-radio` | [team-radio/](../src/app/api/team-radio/) | OpenF1 | `liveResults` | Radio clips per session |
| `/api/driver-career` | [driver-career/](../src/app/api/driver-career/) | Jolpica | `careerStats` | Career totals |
| `/api/driver-season` | [driver-season/](../src/app/api/driver-season/) | Jolpica | `careerStats` | Per-season splits |
| `/api/driver-photos` | [driver-photos/](../src/app/api/driver-photos/) | OpenF1 + cache | `driverProfile` | Module-scoped `lastKnownGood` fallback |
| `/api/form` | [form/](../src/app/api/form/) | Jolpica | `recentForm` + `historicalResults` + `raceSchedule` | Last-N form chip data |
| `/api/circuit-info` | [circuit-info/](../src/app/api/circuit-info/) | MultiViewer + Jolpica | `circuitMeta` | Layout + meta |
| `/api/circuit-records` | [circuit-records/](../src/app/api/circuit-records/) | Jolpica | `circuitRecords` | Pole/lap records |
| `/api/weather` | [weather/](../src/app/api/weather/) | Open-Meteo | `weather` | Forecast for race weekend |
| `/api/wikidata` | [wikidata/](../src/app/api/wikidata/) | Wikidata | `socialBio` | 30-day cache |
| `/api/news` | [news/](../src/app/api/news/) | RSS | `newsFeed` | Aggregated feed |
| `/api/compare` | [compare/](../src/app/api/compare/) | Jolpica | `careerStats`, `historicalResults`, `liveStandings` | Head-to-head driver compare |
| `/api/projections` | [projections/](../src/app/api/projections/) | precomputed snapshot | `projectionSnapshot` | Returns `available: false` on cold cache; populated by cron |
| `/api/search` | [search/](../src/app/api/search/) | local | static | Driver/team/race lookup |
| `/api/logo` | [logo/](../src/app/api/logo/) | static SVG | static | Team logo passthrough with cache headers |

## Patterns you'll re-use

### Dispatcher + view handlers

`/api/compare` uses a thin dispatcher in
[src/app/api/compare/route.ts](../src/app/api/compare/route.ts) and keeps
view-specific logic in
[src/app/api/compare/_views.ts](../src/app/api/compare/_views.ts).

Use this pattern when one endpoint supports multiple `view=` modes but must
keep a stable URL contract.

### Validation

Every external input goes through a named regex in
[validators.ts](../src/lib/validators.ts):

```ts
import { VALID_YEAR, VALID_ROUND, VALID_ID } from "@/lib/validators";

if (!VALID_YEAR.test(year ?? "")) return badRequest("Invalid year");
if (!VALID_ROUND.test(round ?? "")) return badRequest("Invalid round");
if (!VALID_ID.test(id ?? "")) return badRequest("Invalid driver id");
```

Add new patterns in `validators.ts` (with positive + injection-rejection tests
in `src/app/api/__tests__/validation.test.ts`) before wiring them into routes.

### Parallel fan-out

```ts
const [standings, schedule, lastRace] = await Promise.all([
  getDriverStandings("current"),
  getSchedule("current"),
  getLastRace(),
]);
```

Use `Promise.all()` when every result is required. Use `Promise.allSettled()`
when a partial success is still useful (the common case for pages).

### Graceful degradation

```ts
try {
  return NextResponse.json(await fetchData());
} catch (err) {
  if (isOptionalUpstream(err)) {
    return NextResponse.json({ available: false, reason: "openf1-unavailable" });
  }
  return serverError("compare-season", err);
}
```

A `{ available: false, reason }` response should always carry a 200 status — the
*upstream* failed, but our route succeeded.

Error and degraded payloads must stay uncached. Only successful 200-OK payloads
should use `cachedJson(...)`; avoid caching `serverError(...)` and
`gracefulDegradation(...)` responses.

Policy baseline (mirrors `AGENTS.md`): use HTTP 200 + `{ available:false }`
only for optional enrichment routes with designed empty-states (currently
`/api/standings`, `/api/circuit-info`, `/api/race-incidents`). Use
`serverError(...)` for primary-content routes where clients branch on `!res.ok`.
Do not flip existing routes between these modes without coordinated client
changes.

### Cron-protected routes

Routes triggered by a Vercel cron check the bearer token:

```ts
const auth = req.headers.get("authorization");
if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
  return new NextResponse("Unauthorized", { status: 401 });
}
```

See [12-deployment.md](12-deployment.md) for cron schedules.

### Sample full route

Trimmed from [src/app/api/driver-photos/route.ts](../src/app/api/driver-photos/route.ts):

```ts
export const revalidate = 2592000; // 30 days — literal required by Next

const CACHE_KEY = ["driver-photos-v4-monthly"];
let lastKnownGoodPhotos: DriverPhoto[] = [];

export async function GET(req: NextRequest) {
  const limited = rateLimited(req, "driver-photos");
  if (limited) return limited;

  try {
    const photos = await unstable_cache(
      async () => {
        const fresh = await fetchOpenF1Photos();
        if (fresh.length > 0) lastKnownGoodPhotos = fresh;
        return fresh.length > 0 ? fresh : lastKnownGoodPhotos;
      },
      CACHE_KEY,
      { revalidate: adaptiveRevalidate("driverProfile") },
    )();
    return NextResponse.json({ photos });
  } catch (err) {
    return NextResponse.json({ photos: lastKnownGoodPhotos });
  }
}
```

## Adding a new route

Use the template in [13-recipes.md](13-recipes.md). Don't forget:

- A `route.test.ts` covering 400 (invalid input), 200 (happy path), and the
  500/degraded path.
- A new `routeKey` for the rate limiter.
- If the route's behaviour changes shape, bump the cache-key version.

Next: [08 — Pages Walkthrough](08-pages.md).
