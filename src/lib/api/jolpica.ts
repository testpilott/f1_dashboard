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
import { verifyChampionships } from "@/lib/api/championshipVerification";
import {
  CURRENT_SEASON,
  LIMIT_CONSTRUCTORS,
  LIMIT_COUNT_ONLY,
  LIMIT_FULL_GRID,
  LIMIT_MAX,
  LIMIT_PAGE,
  LIMIT_RACE_ENTRIES,
} from "@/lib/api/jolpicaLimits";
import { firstRace, firstRaceField, paginateMRData } from "@/lib/api/mrData";

const JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1";
// Background snapshot writers set JOLPICA_FETCH_TIMEOUT_MS (e.g. 30000) so a
// large season-results payload or a slow/tarpitted upstream doesn't abort on
// the 8 s user-request default. Unset in production → default applies.
const JOLPICA_TIMEOUT_MS = Number(process.env.JOLPICA_FETCH_TIMEOUT_MS) || undefined;
const jolpicaApi = createApiFetcher(JOLPICA_BASE, "Jolpica", undefined, JOLPICA_TIMEOUT_MS);

async function jolpicaFetch<T>(path: string, dataClass: DataClass = "liveStandings"): Promise<T> {
  return jolpicaApi<T>(path, adaptiveRevalidate(dataClass));
}

// ─── Standings ────────────────────────────────────────────────────────────────

export async function getDriverStandings(season = CURRENT_SEASON): Promise<DriverStanding[]> {
  const data = await jolpicaFetch<{
    MRData: { StandingsTable: { StandingsLists: { DriverStandings: DriverStanding[] }[] } };
  }>(`/${season}/driverStandings.json?limit=${LIMIT_FULL_GRID}`);
  return data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];
}

export async function getConstructorStandings(season = CURRENT_SEASON): Promise<ConstructorStanding[]> {
  const data = await jolpicaFetch<{
    MRData: { StandingsTable: { StandingsLists: { ConstructorStandings: ConstructorStanding[] }[] } };
  }>(`/${season}/constructorStandings.json?limit=${LIMIT_CONSTRUCTORS}`);
  return data.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? [];
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

export async function getSchedule(season = CURRENT_SEASON): Promise<Race[]> {
  const data = await jolpicaFetch<{
    MRData: { RaceTable: { Races: Race[] } };
  }>(`/${season}.json?limit=${LIMIT_FULL_GRID}`, "raceSchedule");
  return data.MRData.RaceTable.Races ?? [];
}

// ─── Race results ─────────────────────────────────────────────────────────────

export async function getRaceResults(season: string, round: string): Promise<RaceResult[]> {
  const data = await jolpicaFetch<{
    MRData: { RaceTable: { Races: { Results: RaceResult[] }[] } };
  }>(`/${season}/${round}/results.json?limit=${LIMIT_RACE_ENTRIES}`, "historicalResults");
  return firstRaceField<"Results", RaceResult>(data, "Results");
}

export async function getQualifyingResults(season: string, round: string): Promise<QualifyingResult[]> {
  const data = await jolpicaFetch<{
    MRData: { RaceTable: { Races: { QualifyingResults: QualifyingResult[] }[] } };
  }>(`/${season}/${round}/qualifying.json?limit=${LIMIT_RACE_ENTRIES}`, "historicalResults");
  return firstRaceField<"QualifyingResults", QualifyingResult>(data, "QualifyingResults");
}

export async function getSprintResults(season: string, round: string): Promise<SprintResult[]> {
  const data = await jolpicaFetch<{
    MRData: { RaceTable: { Races: { SprintResults: SprintResult[] }[] } };
  }>(`/${season}/${round}/sprint.json?limit=${LIMIT_RACE_ENTRIES}`, "historicalResults");
  return firstRaceField<"SprintResults", SprintResult>(data, "SprintResults");
}

/**
 * Every sprint result in a season, as Race rows carrying `SprintResults`.
 * A season has at most ~6 sprint weekends (~120 result rows), so one
 * max-limit page always covers it — no pagination loop needed.
 */
export async function getSeasonSprintResults(season: string): Promise<Race[]> {
  const data = await jolpicaFetch<{
    MRData: { RaceTable: { Races: Race[] } };
  }>(`/${season}/sprint.json?limit=${LIMIT_MAX}`, "historicalResults");
  return data.MRData.RaceTable.Races ?? [];
}

// ─── Historical lookup ────────────────────────────────────────────────────────

/**
 * Partial season race results for projections. Intentionally limited to the
 * current full-grid page size to preserve existing projections behavior.
 */
export async function getSeasonResultsFirstPage(season: string): Promise<Race[]> {
  const data = await jolpicaFetch<{
    MRData: { RaceTable: { Races: Race[] } };
  }>(`/${season}/results.json?limit=${LIMIT_FULL_GRID}`, "historicalResults");
  return data.MRData.RaceTable.Races ?? [];
}

/**
 * Full-season race results (all rounds). Uses Ergast's max page size so the
 * whole season is returned — unlike getSeasonResultsFirstPage (LIMIT_FULL_GRID) which is left
 * unchanged to avoid altering projections' behaviour.
 */
export async function getSeasonResultsAllPages(season: string): Promise<Race[]> {
  const data = await jolpicaFetch<{
    MRData: { RaceTable: { Races: Race[] } };
  }>(`/${season}/results.json?limit=${LIMIT_MAX}`, "historicalResults");
  return data.MRData.RaceTable.Races ?? [];
}

// ─── Next race helper ─────────────────────────────────────────────────────────

export async function getRaceResultsAtCircuit(season: string, circuitId: string): Promise<RaceResult[]> {
  const data = await jolpicaFetch<{
    MRData: { RaceTable: { Races: { Results: RaceResult[] }[] } };
  }>(`/${season}/circuits/${circuitId}/results.json?limit=${LIMIT_RACE_ENTRIES}`, "historicalResults");
  return firstRaceField<"Results", RaceResult>(data, "Results");
}

export async function getQualifyingResultsAtCircuit(season: string, circuitId: string): Promise<QualifyingResult[]> {
  const data = await jolpicaFetch<{
    MRData: { RaceTable: { Races: { QualifyingResults: QualifyingResult[] }[] } };
  }>(`/${season}/circuits/${circuitId}/qualifying.json?limit=${LIMIT_RACE_ENTRIES}`, "historicalResults");
  return firstRaceField<"QualifyingResults", QualifyingResult>(data, "QualifyingResults");
}

// ─── Career counts ────────────────────────────────────────────────────────────

async function jolpicaCareerTotal(path: string): Promise<string> {
  // Career totals only change after a race; weekly bucket is the right tier.
  const data = await jolpicaFetch<{ MRData: { total: string } }>(path, "careerStats");
  return data.MRData.total ?? "0";
}

export async function getDriverCareerWins(driverId: string): Promise<string> {
  return jolpicaCareerTotal(`/drivers/${encodeURIComponent(driverId)}/results/1.json?limit=${LIMIT_COUNT_ONLY}`);
}

export async function getDriverCareerP2(driverId: string): Promise<string> {
  return jolpicaCareerTotal(`/drivers/${encodeURIComponent(driverId)}/results/2.json?limit=${LIMIT_COUNT_ONLY}`);
}

export async function getDriverCareerP3(driverId: string): Promise<string> {
  return jolpicaCareerTotal(`/drivers/${encodeURIComponent(driverId)}/results/3.json?limit=${LIMIT_COUNT_ONLY}`);
}

export async function getDriverCareerStarts(driverId: string): Promise<string> {
  return jolpicaCareerTotal(`/drivers/${encodeURIComponent(driverId)}/results.json?limit=${LIMIT_COUNT_ONLY}`);
}

export async function getDriverCareerFastestLaps(driverId: string): Promise<string> {
  return jolpicaCareerTotal(`/drivers/${encodeURIComponent(driverId)}/fastest/1/results.json?limit=${LIMIT_COUNT_ONLY}`);
}

export async function getDriverCareerChampionships(driverId: string): Promise<string> {
  // The set of Formula 1 World Drivers' Champions is a closed, append-only
  // list (see KNOWN_CHAMPIONSHIPS). Any driver not on that list has 0 titles
  // by definition — short-circuit without touching Jolpica. This eliminates
  // the most common cause of a null championships field (an upstream blip on
  // a network call we didn't actually need to make).
  const floor = getKnownChampionshipFloor(driverId);
  if (floor === 0) return "0";

  const verified = await verifyChampionships(driverId, floor, {
    getSeasons: getDriverSeasons,
    countTitleInSeason: async (id: string, season: number) => {
      const path = `/${season}/drivers/${encodeURIComponent(id)}/driverStandings/1.json?limit=${LIMIT_COUNT_ONLY}`;
      const total = await jolpicaCareerTotal(path);
      return Number(total) > 0 ? 1 : 0;
    },
  });

  return String(verified);
}

/** Returns the list of seasons a driver competed in, oldest first. */
export async function getDriverSeasons(driverId: string): Promise<number[]> {
  const data = await jolpicaFetch<{
    MRData: { SeasonTable: { Seasons: { season: string }[] } };
  }>(`/drivers/${encodeURIComponent(driverId)}/seasons.json?limit=${LIMIT_PAGE}`, "careerStats");
  const seasons = data.MRData.SeasonTable?.Seasons ?? [];
  return seasons
    .map((s) => parseInt(s.season, 10))
    .filter((y) => !isNaN(y))
    .sort((a, b) => a - b);
}

/** Returns all historical race entries for a circuit (all seasons). */
export async function getAllRaceResultsAtCircuit(circuitId: string): Promise<Race[]> {
  const races = await paginateMRData(
    async (offset: number) =>
      jolpicaFetch<{
        MRData: {
          total: string;
          offset: string;
          limit: string;
          RaceTable: { Races: Race[] };
        };
      }>(
        `/circuits/${encodeURIComponent(circuitId)}/results.json?limit=${LIMIT_PAGE}&offset=${offset}`,
        "historicalResults",
      ),
    (page) => page.MRData.RaceTable.Races ?? [],
    LIMIT_PAGE,
  );

  const racesByKey = new Map<string, Race>();

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

  return Array.from(racesByKey.values()).sort((a, b) => {
    const seasonDiff = parseInt(a.season, 10) - parseInt(b.season, 10);
    if (seasonDiff !== 0) return seasonDiff;
    return parseInt(a.round, 10) - parseInt(b.round, 10);
  });
}

/** Fetch all lap timing pages for a race. */
export async function getRaceLaps(year: string, round: string): Promise<JolpicaLap[]> {
  return paginateMRData(
    async (offset: number) =>
      jolpicaFetch<{
        MRData: {
          total: string;
          offset: string;
          limit: string;
          RaceTable: { Races: { Laps: JolpicaLap[] }[] };
        };
      }>(`/${year}/${round}/laps.json?limit=${LIMIT_PAGE}&offset=${offset}`, "historicalResults"),
    (page) => firstRaceField<"Laps", JolpicaLap>(page, "Laps"),
    LIMIT_PAGE,
  );
}

/** Fetch all pit-stop rows for a race. */
export async function getRacePitstops(year: string, round: string): Promise<JolpicaPitstop[]> {
  const data = await jolpicaFetch<{
    MRData: { RaceTable: { Races: { PitStops: JolpicaPitstop[] }[] } };
  }>(`/${year}/${round}/pitstops.json?limit=${LIMIT_MAX}`, "historicalResults");
  return firstRaceField<"PitStops", JolpicaPitstop>(data, "PitStops");
}

export async function getNextRace(): Promise<Race | null> {
  const data = await jolpicaFetch<{
    MRData: { RaceTable: { Races: Race[] } };
  }>("/current/next.json");
  return firstRace(data);
}

export async function getLastRace(): Promise<Race | null> {
  const data = await jolpicaFetch<{
    MRData: { RaceTable: { Races: Race[] } };
  }>(`/current/last/results.json?limit=${LIMIT_RACE_ENTRIES}`);
  return firstRace(data);
}
