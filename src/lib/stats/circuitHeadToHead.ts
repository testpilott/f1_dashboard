import { parsePoints, parsePosition } from "@/lib/stats/parsing";

interface CircuitDriverResult {
  race: {
    position: number | null;
    points: number;
    status: string;
    fastestLap: string | null;
    hasFastestLap: boolean;
  } | null;
  quali: { position: number | null; bestTime: string | null } | null;
}

export interface CircuitComparisonRow {
  year: number;
  a: CircuitDriverResult;
  b: CircuitDriverResult;
}

export interface CircuitHeadToHead {
  winsA: number;
  winsB: number;
  podiumsA: number;
  podiumsB: number;
  bestQualiA: number | null;
  bestQualiB: number | null;
  bestQualiTimeA: string | null;
  bestQualiTimeB: string | null;
  pointsA: number;
  pointsB: number;
}

function parseOptionalPosition(value: number | null | undefined): number {
  return parsePosition(value == null ? undefined : String(value));
}

function parseOptionalPoints(value: number | null | undefined): number {
  return parsePoints(value == null ? undefined : String(value));
}

export function circuitHeadToHead(history: CircuitComparisonRow[]): CircuitHeadToHead {
  const safe = Array.isArray(history) ? history : [];

  const winsA = safe.filter((h) => parseOptionalPosition(h.a.race?.position) === 1).length;
  const winsB = safe.filter((h) => parseOptionalPosition(h.b.race?.position) === 1).length;

  const podiumsA = safe.filter((h) => parseOptionalPosition(h.a.race?.position) <= 3).length;
  const podiumsB = safe.filter((h) => parseOptionalPosition(h.b.race?.position) <= 3).length;

  const bestQualiAValue = Math.min(...safe.map((h) => parseOptionalPosition(h.a.quali?.position)));
  const bestQualiBValue = Math.min(...safe.map((h) => parseOptionalPosition(h.b.quali?.position)));

  const bestQualiTimeA =
    safe.flatMap((h) => (h.a.quali?.bestTime ? [h.a.quali.bestTime] : [])).sort()[0] ?? null;
  const bestQualiTimeB =
    safe.flatMap((h) => (h.b.quali?.bestTime ? [h.b.quali.bestTime] : [])).sort()[0] ?? null;

  const pointsA = safe.reduce((sum, h) => sum + parseOptionalPoints(h.a.race?.points), 0);
  const pointsB = safe.reduce((sum, h) => sum + parseOptionalPoints(h.b.race?.points), 0);

  return {
    winsA,
    winsB,
    podiumsA,
    podiumsB,
    bestQualiA: bestQualiAValue < 99 ? bestQualiAValue : null,
    bestQualiB: bestQualiBValue < 99 ? bestQualiBValue : null,
    bestQualiTimeA,
    bestQualiTimeB,
    pointsA,
    pointsB,
  };
}