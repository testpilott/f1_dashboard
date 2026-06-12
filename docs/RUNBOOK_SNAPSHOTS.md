# Snapshot system runbook

## How to manually refresh
- Daily snapshots: `gh workflow run snapshot-daily.yml` (or in GitHub UI)
- Weekly snapshots: `gh workflow run snapshot-weekly.yml`
- Force a recompute of one snapshot key: delete `data/snapshots/<key>.json`,
  commit + push to main. The next lambda invocation will fall through to live
  and the next daily run will write a fresh snapshot.

## How to read a snapshot
`cat data/snapshots/standings-current.json | jq .` — they are pretty-printed JSON.

## How to roll back a bad snapshot
`git revert <snapshot-commit-sha>` on main. The previous good snapshot is
restored, lambda picks it up on next invocation.

## Diagnosing 429s
Check Vercel logs for `[snapshot-miss]` lines — those identify exactly which
keys are falling through to live Jolpica. If the same key shows up repeatedly,
either:
- the daily writer is failing (check the `snapshot-daily` GitHub Action run
  history), or
- a route's `key` doesn't match the writer's filename (typo).

## Cron schedule
| When (UTC) | Action | Source |
|---|---|---|
| `0 5 * * *` | Daily refresh | `.github/workflows/snapshot-daily.yml` |
| `30 5 * * 1` | Weekly refresh (Mon) | `.github/workflows/snapshot-weekly.yml` |
| `0 6 * * *` | Vercel projections warm | `vercel.json` |

## Snapshot keys reference

| Key pattern | Written by | Route(s) |
|---|---|---|
| `standings-current` | `snapshot-daily.ts` | `/api/standings?season=current` |
| `schedule-current` | `snapshot-daily.ts` | `/api/schedule?season=current` |
| `season-results-current` | `snapshot-daily.ts` | `/api/compare` |
| `driver-career-{id}` | `snapshot-weekly.ts` | `/api/driver-career?driverId={id}` |
| `driver-season-current-{id}` | `snapshot-weekly.ts` | `/api/driver-season?season=current&driverId={id}` |
| `circuit-records-{id}` | `snapshot-weekly.ts` | `/api/circuit-records?circuitId={id}` |

> The `/api/driver-season` route reads `driver-season-{season}-{id}`, whose payload
> mirrors the route's `{ season, driverId, summary }` shape so the standings driver
> dialog can read `data.summary.rows` directly. The weekly writer only emits the
> `current` season; other seasons fall through to a live Jolpica fetch.
