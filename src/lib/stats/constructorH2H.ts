import type { Race } from "@/lib/types";

export interface ConstructorSeasonStats {
  constructorId: string;
  name: string;
  totalPoints: number;
  wins: number;
  podiums: number;
  oneTwos: number;
  dnfs: number;
  racesEntered: number;
  avgBestFinish: number;
}

export interface ConstructorH2HResult {
  racesCompared: number;
  aheadA: number;
  aheadB: number;
  a: ConstructorSeasonStats;
  b: ConstructorSeasonStats;
}

function emptyStats(constructorId: string, name: string): ConstructorSeasonStats {
  return { constructorId, name, totalPoints: 0, wins: 0, podiums: 0, oneTwos: 0, dnfs: 0, racesEntered: 0, avgBestFinish: 0 };
}

export function constructorHeadToHead(
  races: Race[],
  constructorAId: string,
  constructorBId: string
): ConstructorH2HResult {
  if (!Array.isArray(races) || !constructorAId || !constructorBId) {
    return { racesCompared: 0, aheadA: 0, aheadB: 0, a: emptyStats(constructorAId, ""), b: emptyStats(constructorBId, "") };
  }

  const a = emptyStats(constructorAId, constructorAId);
  const b = emptyStats(constructorBId, constructorBId);
  let racesCompared = 0;
  let aheadA = 0;
  let aheadB = 0;
  let sumBestA = 0;
  let sumBestB = 0;

  for (const race of races) {
    const results = race.Results ?? [];
    const aResults = results.filter((r) => r.Constructor?.constructorId === constructorAId);
    const bResults = results.filter((r) => r.Constructor?.constructorId === constructorBId);
    if (aResults.length === 0 && bResults.length === 0) continue;

    // Per-constructor stats
    for (const [stats, driverResults] of [[a, aResults], [b, bResults]] as const) {
      stats.racesEntered += driverResults.length > 0 ? 1 : 0;
      for (const r of driverResults) {
        const pts = parseFloat(r.points ?? "0");
        if (!isNaN(pts)) stats.totalPoints += pts;
        const pos = parseInt(r.position ?? "99", 10);
        if (pos === 1) stats.wins++;
        if (pos <= 3) stats.podiums++;
        if (r.status && !r.status.startsWith("Finished") && r.status !== "+1 Lap" && r.status !== "+2 Laps") {
          stats.dnfs++;
        }
      }
      // 1-2 check
      const finishPositions = driverResults
        .map((r) => parseInt(r.position ?? "99", 10))
        .filter((p) => p <= 2);
      if (finishPositions.length === 2 && new Set(finishPositions).size === 2) stats.oneTwos++;
    }

    // H2H: compare best finish per team per race
    if (aResults.length > 0 && bResults.length > 0) {
      const bestA = Math.min(...aResults.map((r) => parseInt(r.position ?? "99", 10)));
      const bestB = Math.min(...bResults.map((r) => parseInt(r.position ?? "99", 10)));
      racesCompared++;
      sumBestA += bestA;
      sumBestB += bestB;
      if (bestA < bestB) aheadA++;
      else if (bestB < bestA) aheadB++;
    }
  }

  a.avgBestFinish = racesCompared > 0 ? Math.round((sumBestA / racesCompared) * 10) / 10 : 0;
  b.avgBestFinish = racesCompared > 0 ? Math.round((sumBestB / racesCompared) * 10) / 10 : 0;

  // Fill constructor name from first match
  for (const race of races) {
    for (const r of race.Results ?? []) {
      if (r.Constructor?.constructorId === constructorAId && a.name === constructorAId)
        a.name = r.Constructor.name ?? constructorAId;
      if (r.Constructor?.constructorId === constructorBId && b.name === constructorBId)
        b.name = r.Constructor.name ?? constructorBId;
    }
  }

  return { racesCompared, aheadA, aheadB, a, b };
}
