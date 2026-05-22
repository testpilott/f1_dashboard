import type {
  DriverStanding,
  ConstructorStanding,
  Race,
  RaceResult,
  QualifyingResult,
  SprintResult,
  JolpicaLap,
  JolpicaPitstop,
} from "@/lib/types";
import { adaptiveRevalidate, type DataClass } from "@/lib/cacheStrategy";
import { createApiFetcher } from "@/lib/api/createApiFetcher";
import { getKnownChampionshipFloor } from "@/lib/constants/knownChampionships";

const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1";
const jolpicaApi = createApiFetcher(JOLPICA_BASE, "Jolpica");

async function jolpicaFetch<T>(path: string, dataClass: DataClass = "standings"): Promise<T> {
  return jolpicaApi<T>(path, adaptiveRevalidate(dataClass));
}

// ─── Standings ────────────────────────────────────────────────────────────────

export async function getDriverStandings(season = "current"): Promise<DriverStanding[]> {
  const data = await jolpicaFetch<{
    MRData: { StandingsTable: { StandingsLists: { DriverStandings: DriverStanding[] }[] } };
  }>(`/${season}/driverStandings.json?limit=30`);
  return data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];
}

export async function getConstructorStandings(season = "current"): Promise<ConstructorStanding[]> {
  const data = await jolpicaFetch<{
    MRData: { StandingsTable: { StandingsLists: { ConstructorStandings: ConstructorStanding[] }[] } };
  }>(`/${season}/constructorStandings.json?limit=15`);
  return data.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? [];
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

export async function getSchedule(season = "current"): Promise<Race[]> {
  const data = await jolpicaFetch<{
    MRData: { RaceTable: { Races: Race[] } };
  }>(`/${season}.json?limit=30`, "schedule");
  return data.MRData.RaceTable.Races ?? [];
}

// ─── Race results ─────────────────────────────────────────────────────────────

export async function getRaceResults(season: string, round: string): Promise<RaceResult[]> {
  const data = await jolpicaFetch<{
    MRData: { RaceTable: { Races: { Results: RaceResult[] }[] } };
  }>(`/${season}/${round}/results.json?limit=25`, "results");
  return data.MRData.RaceTable.Races[0]?.Results ?? [];
}

export async function getQualifyingResults(season: string, round: string): Promise<QualifyingResult[]> {
  const data = await jolpicaFetch<{
    MRData: { RaceTable: { Races: { QualifyingResults: QualifyingResult[] }[] } };
  }>(`/${season}/${round}/qualifying.json?limit=25`, "results");
  return data.MRData.RaceTable.Races[0]?.QualifyingResults ?? [];
}

export async function getSprintResults(season: string, round: string): Promise<SprintResult[]> {
  const data = await jolpicaFetch<{
    MRData: { RaceTable: { Races: { SprintResults: SprintResult[] }[] } };
  }>(`/${season}/${round}/sprint.json?limit=25`, "results");
  return data.MRData.RaceTable.Races[0]?.SprintResults ?? [];
}

// ─── Historical lookup ────────────────────────────────────────────────────────


export async function getSeasonResults(season: string): Promise<Race[]> {
  const data = await jolpicaFetch<{
    MRData: { RaceTable: { Races: Race[] } };
  }>(`/${season}/results.json?limit=30`, "results");
  return data.MRData.RaceTable.Races ?? [];
}

/**
 * Full-season race results (all rounds). Uses Ergast's max page size so the
 * whole season is returned — unlike getSeasonResults (limit=30) which is left
 * unchanged to avoid altering projections' behaviour.
 */
export async function getSeasonRaceResults(season: string): Promise<Race[]> {
  const data = await jolpicaFetch<{
    MRData: { RaceTable: { Races: Race[] } };
  }>(`/${season}/results.json?limit=1000`, "results");
  return data.MRData.RaceTable.Races ?? [];
}

// ─── Next race helper ─────────────────────────────────────────────────────────

export async function getRaceResultsAtCircuit(season: string, circuitId: string): Promise<RaceResult[]> {
  const data = await jolpicaFetch<{
    MRData: { RaceTable: { Races: { Results: RaceResult[] }[] } };
  }>(`/${season}/circuits/${circuitId}/results.json?limit=25`, "results");
  return data.MRData.RaceTable.Races[0]?.Results ?? [];
}

export async function getQualifyingResultsAtCircuit(season: string, circuitId: string): Promise<QualifyingResult[]> {
  const data = await jolpicaFetch<{
    MRData: { RaceTable: { Races: { QualifyingResults: QualifyingResult[] }[] } };
  }>(`/${season}/circuits/${circuitId}/qualifying.json?limit=25`, "results");
  return data.MRData.RaceTable.Races[0]?.QualifyingResults ?? [];
}

// ─── Career counts ────────────────────────────────────────────────────────────

async function jolpicaTotal(path: string): Promise<string> {
  const data = await jolpicaFetch<{ MRData: { total: string } }>(path, "results");
  return data.MRData.total ?? "0";
}

export async function getDriverCareerWins(driverId: string): Promise<string> {
  return jolpicaTotal(`/drivers/${encodeURIComponent(driverId)}/results/1.json?limit=1`);
}

export async function getDriverCareerP2(driverId: string): Promise<string> {
  return jolpicaTotal(`/drivers/${encodeURIComponent(driverId)}/results/2.json?limit=1`);
}

export async function getDriverCareerP3(driverId: string): Promise<string> {
  return jolpicaTotal(`/drivers/${encodeURIComponent(driverId)}/results/3.json?limit=1`);
}

export async function getDriverCareerStarts(driverId: string): Promise<string> {
  return jolpicaTotal(`/drivers/${encodeURIComponent(driverId)}/results.json?limit=1`);
}

export async function getDriverCareerFastestLaps(driverId: string): Promise<string> {
  return jolpicaTotal(`/drivers/${encodeURIComponent(driverId)}/fastest/1/results.json?limit=1`);
}

export async function getDriverCareerChampionships(driverId: string): Promise<string> {
  // Jolpica REQUIRES a season_year for the driverStandings endpoint (unlike
  // upstream Ergast), so we must fan out one request per season. The fan-out
  // is made resilient by:
  //   1. Catching per-season errors instead of letting Promise.all reject the
  //      whole count — a transient failure on one season won't blank the result.
  //   2. Falling back to the known-champion floor if the seasons-list lookup
  //      itself fails (e.g. Hamilton always reports >= 7 even if upstream is down).
  //   3. Clamping the final count to max(observed, floor) so the value can only
  //      ever increase past the closed historical list, never decrease below it.
  const floor = getKnownChampionshipFloor(driverId);

  let seasons: number[];
  try {
    seasons = await getDriverSeasons(driverId);
  } catch (err) {
    // If we have a static floor for this driver, return it rather than null.
    // Otherwise propagate so the route can degrade gracefully.
    if (floor > 0) return String(floor);
    throw err;
  }

  if (seasons.length === 0) return String(floor);

  async function hasChampionshipInSeason(season: number): Promise<boolean> {
    const path = `/${season}/drivers/${encodeURIComponent(driverId)}/driverStandings/1.json?limit=1`;
    const total = await jolpicaTotal(path);
    return Number(total) > 0;
  }

  // Bounded worker pool — keeps fan-out off the rate-limit ceiling on
  // long-career drivers (Alonso ~24 seasons). Per-season failures are
  // swallowed so they can't sink the whole count.
  const CONCURRENCY = 4;
  const seasonChecks: boolean[] = new Array(seasons.length).fill(false);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = cursor++;
      if (index >= seasons.length) return;
      try {
        seasonChecks[index] = await hasChampionshipInSeason(seasons[index]);
      } catch {
        // Tolerate per-season failures — the floor will cover known champions
        // and the worst case for unknown drivers is a 0 that matches reality
        // for the overwhelming majority of grid history.
        seasonChecks[index] = false;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, seasons.length) }, () => worker()),
  );

  const observed = seasonChecks.reduce(
    (count, hasTitle) => (hasTitle ? count + 1 : count),
    0,
  );

  return String(Math.max(observed, floor));
}

/** Returns the list of seasons a driver competed in, oldest first. */
export async function getDriverSeasons(driverId: string): Promise<number[]> {
  const data = await jolpicaFetch<{
    MRData: { SeasonTable: { Seasons: { season: string }[] } };
  }>(`/drivers/${encodeURIComponent(driverId)}/seasons.json?limit=100`, "results");
  const seasons = data.MRData.SeasonTable?.Seasons ?? [];
  return seasons
    .map((s) => parseInt(s.season, 10))
    .filter((y) => !isNaN(y))
    .sort((a, b) => a - b);
}

/** Returns all historical race entries for a circuit (all seasons). */
export async function getAllRaceResultsAtCircuit(circuitId: string): Promise<Race[]> {
  const limit = 100;
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  const racesByKey = new Map<string, Race>();

  while (offset < total) {
    const data = await jolpicaFetch<{
      MRData: {
        total: string;
        offset: string;
        limit: string;
        RaceTable: { Races: Race[] };
      };
    }>(`/circuits/${encodeURIComponent(circuitId)}/results.json?limit=${limit}&offset=${offset}`, "results");

    const races = data.MRData.RaceTable.Races ?? [];
    for (const race of races) {
      const key = `${race.season}-${race.round}`;
      const existing = racesByKey.get(key);
      if (!existing) {
        racesByKey.set(key, {
          ...race,
          Results: [...(race.Results ?? [])],
        });
        continue;
      }

      const seen = new Set((existing.Results ?? []).map((r) => `${r.number}:${r.Driver?.driverId ?? ""}`));
      const incoming = (race.Results ?? []).filter(
        (r) => !seen.has(`${r.number}:${r.Driver?.driverId ?? ""}`)
      );
      existing.Results = [...(existing.Results ?? []), ...incoming];
    }

    const parsedTotal = parseInt(data.MRData.total ?? "0", 10);
    const parsedOffset = parseInt(data.MRData.offset ?? String(offset), 10);
    const parsedLimit = parseInt(data.MRData.limit ?? String(limit), 10);
    total = isNaN(parsedTotal) ? 0 : parsedTotal;
    offset = parsedOffset + (isNaN(parsedLimit) ? limit : parsedLimit);

    if (races.length === 0) break;
  }

  return Array.from(racesByKey.values()).sort((a, b) => {
    const seasonDiff = parseInt(a.season, 10) - parseInt(b.season, 10);
    if (seasonDiff !== 0) return seasonDiff;
    return parseInt(a.round, 10) - parseInt(b.round, 10);
  });
}

/** Fetch all lap timing pages for a race. */
export async function getRaceLaps(year: string, round: string): Promise<JolpicaLap[]> {
  const limit = 100;
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  const all: JolpicaLap[] = [];

  while (offset < total) {
    const data = await jolpicaFetch<{
      MRData: {
        total: string;
        offset: string;
        limit: string;
        RaceTable: { Races: { Laps: JolpicaLap[] }[] };
      };
    }>(`/${year}/${round}/laps.json?limit=${limit}&offset=${offset}`, "results");

    const laps = data.MRData.RaceTable.Races[0]?.Laps ?? [];
    all.push(...laps);

    const parsedTotal = parseInt(data.MRData.total ?? "0", 10);
    const parsedOffset = parseInt(data.MRData.offset ?? String(offset), 10);
    const parsedLimit = parseInt(data.MRData.limit ?? String(limit), 10);
    total = isNaN(parsedTotal) ? 0 : parsedTotal;
    offset = parsedOffset + (isNaN(parsedLimit) ? limit : parsedLimit);

    if (laps.length === 0) break;
  }

  return all;
}

/** Fetch all pit-stop rows for a race. */
export async function getRacePitstops(year: string, round: string): Promise<JolpicaPitstop[]> {
  const data = await jolpicaFetch<{
    MRData: { RaceTable: { Races: { PitStops: JolpicaPitstop[] }[] } };
  }>(`/${year}/${round}/pitstops.json?limit=1000`, "results");
  return data.MRData.RaceTable.Races[0]?.PitStops ?? [];
}

export async function getNextRace(): Promise<Race | null> {
  const data = await jolpicaFetch<{
    MRData: { RaceTable: { Races: Race[] } };
  }>("/current/next.json");
  return data.MRData.RaceTable.Races[0] ?? null;
}

export async function getLastRace(): Promise<Race | null> {
  const data = await jolpicaFetch<{
    MRData: { RaceTable: { Races: Race[] } };
  }>("/current/last/results.json?limit=25");
  return data.MRData.RaceTable.Races[0] ?? null;
}
