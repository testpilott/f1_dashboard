/**
 * Season-long driver head-to-head, derived purely from Jolpica race results
 * (finishing position, grid slot, points, status). No external calls.
 */
import type { Race } from "@/lib/types";
import { isFinished, mean } from "@/lib/stats/common";
import { parsePoints } from "@/lib/stats/parsing";

export interface DriverSeasonStats {
  driverId: string;
  races: number;
  points: number;
  wins: number;
  podiums: number;
  poles: number; // grid == 1 used as the pole proxy
  dnf: number;
  /** Mean finishing position over classified finishes; 0 when none. */
  avgFinish: number;
  bestFinish: number | null;
}

export interface SeasonHeadToHead {
  a: DriverSeasonStats;
  b: DriverSeasonStats;
  /** Races both drivers started — who finished ahead. */
  raceCompared: number;
  raceAheadA: number;
  raceAheadB: number;
  /** Races both drivers have a grid slot — who started ahead. */
  qualiCompared: number;
  qualiAheadA: number;
  qualiAheadB: number;
}

function emptyStats(driverId: string): DriverSeasonStats {
  return {
    driverId,
    races: 0,
    points: 0,
    wins: 0,
    podiums: 0,
    poles: 0,
    dnf: 0,
    avgFinish: 0,
    bestFinish: null,
  };
}

function collect(races: Race[], driverId: string): DriverSeasonStats {
  const s = emptyStats(driverId);
  const finishes: number[] = [];

  for (const race of races) {
    const r = race.Results?.find((x) => x.Driver?.driverId === driverId);
    if (!r) continue;

    s.races += 1;
    s.points += parsePoints(r.points);

    const pos = parseInt(r.position, 10);
    if (Number.isFinite(parseInt(r.grid, 10)) && parseInt(r.grid, 10) === 1) {
      s.poles += 1;
    }
    if (isFinished(r.status) && pos >= 1) {
      finishes.push(pos);
      if (pos === 1) s.wins += 1;
      if (pos <= 3) s.podiums += 1;
      if (s.bestFinish === null || pos < s.bestFinish) s.bestFinish = pos;
    } else {
      s.dnf += 1;
    }
  }

  s.avgFinish = mean(finishes);
  return s;
}

export function seasonHeadToHead(
  races: Race[],
  driverAId: string,
  driverBId: string,
): SeasonHeadToHead {
  const safeRaces = Array.isArray(races) ? races : [];
  const out: SeasonHeadToHead = {
    a: collect(safeRaces, driverAId),
    b: collect(safeRaces, driverBId),
    raceCompared: 0,
    raceAheadA: 0,
    raceAheadB: 0,
    qualiCompared: 0,
    qualiAheadA: 0,
    qualiAheadB: 0,
  };

  if (!driverAId || !driverBId || driverAId === driverBId) return out;

  for (const race of safeRaces) {
    const ra = race.Results?.find((x) => x.Driver?.driverId === driverAId);
    const rb = race.Results?.find((x) => x.Driver?.driverId === driverBId);
    if (!ra || !rb) continue;

    const pa = parseInt(ra.position, 10);
    const pb = parseInt(rb.position, 10);
    if (Number.isFinite(pa) && Number.isFinite(pb)) {
      out.raceCompared += 1;
      if (pa < pb) out.raceAheadA += 1;
      else if (pb < pa) out.raceAheadB += 1;
    }

    const ga = parseInt(ra.grid, 10);
    const gb = parseInt(rb.grid, 10);
    // Grid 0 means pit-lane start — treat as "no clean grid slot".
    if (ga > 0 && gb > 0) {
      out.qualiCompared += 1;
      if (ga < gb) out.qualiAheadA += 1;
      else if (gb < ga) out.qualiAheadB += 1;
    }
  }

  return out;
}
