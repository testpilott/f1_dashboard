"use client";

import { useQuery } from "@tanstack/react-query";
import type { DriverStanding, Race } from "@/lib/types";
import { fetchJson } from "@/lib/api/clientFetch";

export interface DriverResult {
  race: {
    position: number | null;
    points: number;
    status: string;
    fastestLap: string | null;
    hasFastestLap: boolean;
  } | null;
  quali: { position: number | null; bestTime: string | null } | null;
}

export interface CompareData {
  circuitId: string;
  history: Array<{ year: number; a: DriverResult; b: DriverResult }>;
}

export interface SeasonStats {
  raceCompared: number;
  raceAheadA: number;
  raceAheadB: number;
  qualiCompared: number;
  qualiAheadA: number;
  qualiAheadB: number;
  a: { podiums: number; poles: number };
  b: { podiums: number; poles: number };
}

async function fetchStandings(): Promise<DriverStanding[]> {
  const d = await fetchJson<{ drivers?: DriverStanding[] }>("/api/standings?season=current");
  return Array.isArray(d.drivers) ? d.drivers : [];
}

async function fetchSchedule(): Promise<Race[]> {
  const d = await fetchJson<{ races?: Race[] }>("/api/schedule?season=current");
  return Array.isArray(d.races) ? d.races : [];
}

async function fetchCompare(dA: string, dB: string, cId: string): Promise<CompareData> {
  return fetchJson<CompareData>(
    `/api/compare?driverA=${encodeURIComponent(dA)}&driverB=${encodeURIComponent(dB)}&circuitId=${encodeURIComponent(cId)}`,
  );
}

async function fetchSeasonCompare(dA: string, dB: string): Promise<{ stats: SeasonStats }> {
  return fetchJson<{ stats: SeasonStats }>(
    `/api/compare?view=season&driverA=${encodeURIComponent(dA)}&driverB=${encodeURIComponent(dB)}`,
  );
}

export function useDriverComparison(driverAId: string, driverBId: string, circuitId: string) {
  const { data: standings, isLoading: standLoading } = useQuery({
    queryKey: ["compare-standings"],
    queryFn: fetchStandings,
    staleTime: 5 * 60 * 1000,
  });

  const { data: schedule, isLoading: schedLoading } = useQuery({
    queryKey: ["compare-schedule"],
    queryFn: fetchSchedule,
    staleTime: 10 * 60 * 1000,
  });

  const driverA = standings?.find((d) => d.Driver.driverId === driverAId);
  const driverB = standings?.find((d) => d.Driver.driverId === driverBId);
  const bothSelected = Boolean(driverA && driverB);

  const { data: compareData, isLoading: compareLoading, isError: compareError } = useQuery({
    queryKey: ["circuit-compare", driverAId, driverBId, circuitId],
    queryFn: () => fetchCompare(driverAId, driverBId, circuitId),
    enabled: bothSelected && Boolean(circuitId),
    staleTime: 5 * 60 * 1000,
  });

  const { data: seasonData } = useQuery({
    queryKey: ["season-compare", driverAId, driverBId],
    queryFn: () => fetchSeasonCompare(driverAId, driverBId),
    enabled: bothSelected,
    staleTime: 5 * 60 * 1000,
  });

  const selectedCircuit = schedule?.find((r) => r.Circuit.circuitId === circuitId);

  return {
    standings,
    standLoading,
    schedule,
    schedLoading,
    driverA,
    driverB,
    bothSelected,
    compareData,
    compareLoading,
    compareError,
    seasonData,
    selectedCircuit,
  };
}
