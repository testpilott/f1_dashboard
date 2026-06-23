"use client";

import { useQuery } from "@tanstack/react-query";
import type { ConstructorH2HResult } from "@/lib/stats/constructorH2H";
import type { ConstructorStanding } from "@/lib/types";
import { fetchJson } from "@/lib/api/clientFetch";
import { getTeamColor } from "@/lib/constants";

export const TEAM_SEASON_OPTIONS = Array.from({ length: 6 }, (_, i) =>
  String(new Date().getFullYear() - i),
);

export interface ConstructorContext {
  position: number | null;
  wins: number;
  bestFinish: number | null;
  racesEntered: number;
}

export interface TeamsCompareData {
  stats: ConstructorH2HResult;
  context: { a: ConstructorContext; b: ConstructorContext };
  season: string;
}

async function fetchConstructorStandings(season: string): Promise<ConstructorStanding[]> {
  const d = await fetchJson<{ constructors?: ConstructorStanding[] }>(
    `/api/standings?season=${encodeURIComponent(season)}`,
  );
  return Array.isArray(d.constructors) ? d.constructors : [];
}

async function fetchTeamsCompare(
  cA: string,
  cB: string,
  season: string,
): Promise<TeamsCompareData> {
  return fetchJson<TeamsCompareData>(
    `/api/compare?view=teams&constructorA=${encodeURIComponent(cA)}&constructorB=${encodeURIComponent(cB)}&season=${encodeURIComponent(season)}`,
  );
}

export function useTeamsComparison(
  constructorAId: string,
  constructorBId: string,
  season: string,
) {
  const { data: constructorStandings } = useQuery({
    queryKey: ["compare-constructor-standings", season],
    queryFn: () => fetchConstructorStandings(season),
    staleTime: 5 * 60 * 1000,
  });

  const knownIds = constructorStandings?.map((c) => c.Constructor.constructorId) ?? [];
  const selectedAId = constructorAId && knownIds.includes(constructorAId) ? constructorAId : "";
  const selectedBId = constructorBId && knownIds.includes(constructorBId) ? constructorBId : "";
  const bothSelected = Boolean(selectedAId && selectedBId);
  const constructorA = constructorStandings?.find(
    (c) => c.Constructor.constructorId === selectedAId,
  );
  const constructorB = constructorStandings?.find(
    (c) => c.Constructor.constructorId === selectedBId,
  );
  const colorA = getTeamColor(constructorA?.Constructor.name ?? "");
  const colorB = getTeamColor(constructorB?.Constructor.name ?? "");

  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ["teams-compare", selectedAId, selectedBId, season],
    queryFn: () => fetchTeamsCompare(selectedAId, selectedBId, season),
    enabled: bothSelected,
    staleTime: 5 * 60 * 1000,
  });

  return {
    constructorStandings,
    constructorA,
    constructorB,
    colorA,
    colorB,
    selectedAId,
    selectedBId,
    bothSelected,
    teamsData,
    teamsLoading,
    constructorAValid: !constructorAId || knownIds.includes(constructorAId),
    constructorBValid: !constructorBId || knownIds.includes(constructorBId),
  };
}
