import type { DriverStanding, Race, ChampionshipProjection, DriverProjection } from "@/lib/types";
import { POINTS_SYSTEM, SPRINT_POINTS_SYSTEM, FASTEST_LAP_POINT, getTeamColor } from "@/lib/constants";

const SIMULATIONS = 10_000;

interface DriverSim {
  driverId: string;
  driverCode: string;
  fullName: string;
  teamName: string;
  points: number;
  // Average recent finish position (lower = better)
  avgFinish: number;
  // Standard deviation of recent finishes (higher = less consistent)
  finishStdDev: number;
}

/**
 * Box-Muller transform: generates a normally distributed random number
 * from two uniform random numbers u and v.
 */
function gaussianRandom(mean: number, std: number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + std * z;
}

/**
 * Estimate a driver's average finishing position and std deviation
 * from recent race results in the current season.
 */
function buildDriverStats(
  standings: DriverStanding[],
  seasonRaces: Race[]
): DriverSim[] {
  return standings.map((standing) => {
    const driverId = standing.Driver.driverId;
    const finishes: number[] = [];

    for (const race of seasonRaces) {
      const result = race.Results?.find((r) => r.Driver.driverId === driverId);
      if (result) {
        const pos = parseInt(result.position, 10);
        if (!isNaN(pos)) finishes.push(pos);
      }
    }

    // Default to position proportional to current standings if no results
    const defaultPos = parseInt(standing.position, 10);
    const avgFinish =
      finishes.length > 0
        ? finishes.reduce((a, b) => a + b, 0) / finishes.length
        : defaultPos;

    const variance =
      finishes.length > 1
        ? finishes.reduce((acc, p) => acc + Math.pow(p - avgFinish, 2), 0) / finishes.length
        : 4.0;
    const finishStdDev = Math.sqrt(variance);

    return {
      driverId,
      driverCode: standing.Driver.code,
      fullName: `${standing.Driver.givenName} ${standing.Driver.familyName}`,
      teamName: standing.Constructors[0]?.name ?? "Unknown",
      points: parseFloat(standing.points),
      avgFinish,
      finishStdDev: Math.max(finishStdDev, 1.5), // minimum variance
    };
  });
}

// Base DNF probability per driver per race (~15% historical average in F1)
const BASE_DNF_PROBABILITY = 0.15;

/**
 * Simulate a single race for all drivers. Returns driver → points earned.
 * Includes DNF probability (weighted toward backmarkers) and fastest lap
 * awarded to the best-performing finisher in top 10.
 */
function simulateRace(
  drivers: DriverSim[],
  isSprintRace = false
): Map<string, number> {
  const pointsTable = isSprintRace ? SPRINT_POINTS_SYSTEM : POINTS_SYSTEM;

  // Assign each driver a simulated score (lower = better) and apply DNF chance
  // Backmarkers (higher avgFinish) get slightly more DNF risk
  const simulated = drivers
    .map((d) => {
      const dnfScale = 1 + (d.avgFinish - 1) / (drivers.length * 2);
      const dnfProb = Math.min(BASE_DNF_PROBABILITY * dnfScale, 0.35);
      const dnf = Math.random() < dnfProb;
      return {
        driverId: d.driverId,
        score: Math.max(1, gaussianRandom(d.avgFinish, d.finishStdDev)),
        dnf,
      };
    });

  // Sort ascending (lower score = better finish); DNF drivers go to the back
  simulated.sort((a, b) => {
    if (a.dnf !== b.dnf) return a.dnf ? 1 : -1;
    return a.score - b.score;
  });

  const earned = new Map<string, number>();
  // Track the finishing position index excluding DNFs for fastest lap eligibility
  let finishIndex = 0;
  let fastestLapCandidateIdx = -1;
  let bestScore = Infinity;

  simulated.forEach(({ driverId, score, dnf }, index) => {
    if (dnf) {
      earned.set(driverId, 0);
      return;
    }
    const pts = pointsTable[finishIndex] ?? 0;
    earned.set(driverId, pts);
    // Fastest lap: best raw score (lowest) among finishers in effective top 10
    if (finishIndex < 10 && score < bestScore) {
      bestScore = score;
      fastestLapCandidateIdx = index;
    }
    finishIndex++;
  });

  // Award fastest lap bonus to the best-performing top-10 finisher
  if (fastestLapCandidateIdx >= 0) {
    const fl = simulated[fastestLapCandidateIdx].driverId;
    earned.set(fl, (earned.get(fl) ?? 0) + FASTEST_LAP_POINT);
  }

  return earned;
}

/**
 * Run Monte Carlo championship projections.
 * Returns projected final standings with win/podium probabilities.
 */
export function runProjections(
  standings: DriverStanding[],
  schedule: Race[],
  completedRound: number
): ChampionshipProjection {
  const currentSeason = parseInt(schedule[0]?.season ?? "2026", 10);
  const completedRaces = schedule.filter((r) => parseInt(r.round, 10) <= completedRound);
  const remainingRaces = schedule.filter((r) => parseInt(r.round, 10) > completedRound);

  const driverStats = buildDriverStats(standings, completedRaces);

  // Accumulators over all simulations
  const pointsSum = new Map<string, number[]>();
  const wins = new Map<string, number>();
  const podiums = new Map<string, number>();
  const top5s = new Map<string, number>();

  for (const d of driverStats) {
    pointsSum.set(d.driverId, []);
    wins.set(d.driverId, 0);
    podiums.set(d.driverId, 0);
    top5s.set(d.driverId, 0);
  }

  for (let sim = 0; sim < SIMULATIONS; sim++) {
    const simPoints = new Map<string, number>(
      driverStats.map((d) => [d.driverId, d.points])
    );

    for (const race of remainingRaces) {
      const isSprint = Boolean(race.Sprint);
      // Simulate main race
      const raceEarned = simulateRace(driverStats, false);
      raceEarned.forEach((pts, dId) => {
        simPoints.set(dId, (simPoints.get(dId) ?? 0) + pts);
      });
      // Simulate sprint if weekend has one
      if (isSprint) {
        const sprintEarned = simulateRace(driverStats, true);
        sprintEarned.forEach((pts, dId) => {
          simPoints.set(dId, (simPoints.get(dId) ?? 0) + pts);
        });
      }
    }

    // Rank drivers by final simulated points
    const ranked = [...simPoints.entries()].sort((a, b) => b[1] - a[1]);

    ranked.forEach(([dId, pts], idx) => {
      pointsSum.get(dId)!.push(pts);
      if (idx === 0) wins.set(dId, (wins.get(dId) ?? 0) + 1);
      if (idx < 3) podiums.set(dId, (podiums.get(dId) ?? 0) + 1);
      if (idx < 5) top5s.set(dId, (top5s.get(dId) ?? 0) + 1);
    });
  }

  // Build projection objects
  const projectionDrivers: DriverProjection[] = driverStats.map((d) => {
    const allPoints = (pointsSum.get(d.driverId) ?? []).sort((a, b) => a - b);
    const p10 = allPoints[Math.floor(SIMULATIONS * 0.1)] ?? d.points;
    const p50 = allPoints[Math.floor(SIMULATIONS * 0.5)] ?? d.points;
    const p90 = allPoints[Math.floor(SIMULATIONS * 0.9)] ?? d.points;

    return {
      driverId: d.driverId,
      driverCode: d.driverCode,
      fullName: d.fullName,
      teamName: d.teamName,
      teamColour: getTeamColor(d.teamName),
      currentPoints: d.points,
      projectedPoints: { p10, p50, p90 },
      winProbability: ((wins.get(d.driverId) ?? 0) / SIMULATIONS) * 100,
      podiumProbability: ((podiums.get(d.driverId) ?? 0) / SIMULATIONS) * 100,
      top5Probability: ((top5s.get(d.driverId) ?? 0) / SIMULATIONS) * 100,
    };
  });

  // Sort by win probability descending
  projectionDrivers.sort((a, b) => b.winProbability - a.winProbability);

  return {
    season: currentSeason,
    remainingRaces: remainingRaces.length,
    totalSimulations: SIMULATIONS,
    drivers: projectionDrivers,
    generatedAt: new Date().toISOString(),
  };
}
