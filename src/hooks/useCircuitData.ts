"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/clientFetch";
import type { CircuitInfoPayload } from "@/components/race/TrackSVG";

export interface IncidentsPayload {
  available: boolean;
  reason?: string;
  incidents?: Array<{
    x: number | null;
    y: number | null;
    lap_number: number | null;
    driver_number: number | null;
    flag: string | null;
    category: string;
    message: string;
  }>;
}

async function fetchCircuitInfo(year: string, round: string): Promise<CircuitInfoPayload> {
  return fetchJson<CircuitInfoPayload>(
    `/api/circuit-info?year=${encodeURIComponent(year)}&round=${encodeURIComponent(round)}`,
  );
}

async function fetchRaceIncidents(year: string, round: string): Promise<IncidentsPayload> {
  try {
    return await fetchJson<IncidentsPayload>(
      `/api/race-incidents?year=${encodeURIComponent(year)}&round=${encodeURIComponent(round)}`,
    );
  } catch {
    return { available: false, reason: "Failed to load incidents" };
  }
}

export function useCircuitData(year: string, round: string) {
  const { data, isLoading, isError } = useQuery<CircuitInfoPayload>({
    queryKey: ["circuit-info", year, round],
    queryFn: () => fetchCircuitInfo(year, round),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { data: incidentsData } = useQuery<IncidentsPayload>({
    queryKey: ["race-incidents", year, round],
    queryFn: () => fetchRaceIncidents(year, round),
    staleTime: 5 * 60 * 1000,
  });

  return { data, incidentsData, isLoading, isError };
}
