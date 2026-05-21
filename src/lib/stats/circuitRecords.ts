import type { Race } from "@/lib/types";
import { lapTimeToMs } from "@/lib/time/raceTime";

export interface CircuitRecords {
  mostWins: { driverId: string; name: string; count: number } | null;
  mostPoles: { driverId: string; name: string; count: number } | null;
  fastestLap: { driverId: string; name: string; time: string; year: number } | null;
}

export function computeCircuitRecords(races: Race[]): CircuitRecords {
  if (!Array.isArray(races) || races.length === 0) {
    return { mostWins: null, mostPoles: null, fastestLap: null };
  }

  const wins = new Map<string, { name: string; count: number }>();
  const poles = new Map<string, { name: string; count: number }>();
  let fastest: { driverId: string; name: string; time: string; year: number; ms: number } | null = null;

  for (const race of races) {
    for (const result of race.Results ?? []) {
      const driverId = result.Driver?.driverId;
      const name = `${result.Driver?.givenName ?? ""} ${result.Driver?.familyName ?? ""}`.trim();
      if (!driverId || !name) continue;

      if (result.position === "1") {
        const cur = wins.get(driverId) ?? { name, count: 0 };
        cur.count += 1;
        wins.set(driverId, cur);
      }

      if (result.grid === "1") {
        const cur = poles.get(driverId) ?? { name, count: 0 };
        cur.count += 1;
        poles.set(driverId, cur);
      }

      if (result.FastestLap?.rank === "1") {
        const time = result.FastestLap.Time?.time;
        const ms = time ? lapTimeToMs(time) : NaN;
        if (time && !isNaN(ms)) {
          if (!fastest || ms < fastest.ms) {
            fastest = {
              driverId,
              name,
              time,
              year: parseInt(race.season, 10) || 0,
              ms,
            };
          }
        }
      }
    }
  }

  const maxByCount = (m: Map<string, { name: string; count: number }>) => {
    let bestCount = -1;
    const leaders: { driverId: string; name: string; count: number }[] = [];

    for (const [driverId, data] of m.entries()) {
      if (data.count > bestCount) {
        bestCount = data.count;
        leaders.length = 0;
        leaders.push({ driverId, name: data.name, count: data.count });
      } else if (data.count === bestCount) {
        leaders.push({ driverId, name: data.name, count: data.count });
      }
    }

    if (leaders.length === 0) return null;
    if (leaders.length === 1) return leaders[0];

    const sorted = [...leaders].sort((a, b) => a.name.localeCompare(b.name));
    return {
      driverId: sorted.map((d) => d.driverId).join("|"),
      name: sorted.map((d) => d.name).join(" / "),
      count: sorted[0].count,
    };
  };

  return {
    mostWins: maxByCount(wins),
    mostPoles: maxByCount(poles),
    fastestLap: fastest
      ? {
          driverId: fastest.driverId,
          name: fastest.name,
          time: fastest.time,
          year: fastest.year,
        }
      : null,
  };
}
