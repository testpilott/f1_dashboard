export interface DriverCareerStats {
  wins: number;
  podiums: number;
  starts: number;
  fastestLaps: number;
  championships: number;
}

export function buildDriverCareerStats(raw: {
  wins?: string;
  p2?: string;
  p3?: string;
  starts?: string;
  fastestLaps?: string;
  championships?: string;
}): DriverCareerStats {
  const parse = (v: string | undefined): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const wins = parse(raw.wins);
  const p2 = parse(raw.p2);
  const p3 = parse(raw.p3);
  return {
    wins,
    podiums: wins + p2 + p3,
    starts: parse(raw.starts),
    fastestLaps: parse(raw.fastestLaps),
    championships: parse(raw.championships),
  };
}
