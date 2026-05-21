export interface DriverCareerStats {
  wins: number | null;
  podiums: number | null;
  starts: number | null;
  fastestLaps: number | null;
  championships: number | null;
}

export function buildDriverCareerStats(raw: {
  wins?: string;
  p2?: string;
  p3?: string;
  starts?: string;
  fastestLaps?: string;
  championships?: string;
}): DriverCareerStats {
  const parseNullable = (v: string | undefined): number | null => {
    if (v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const wins = parseNullable(raw.wins);
  const p2 = parseNullable(raw.p2);
  const p3 = parseNullable(raw.p3);
  const podiums =
    wins === null || p2 === null || p3 === null ? null : wins + p2 + p3;
  return {
    wins,
    podiums,
    starts: parseNullable(raw.starts),
    fastestLaps: parseNullable(raw.fastestLaps),
    championships: parseNullable(raw.championships),
  };
}
