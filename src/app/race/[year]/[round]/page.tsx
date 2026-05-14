import RaceDetailClient from "@/components/race/RaceDetailClient";
import { getQualifyingResults, getRaceResults, getSchedule, getSprintResults } from "@/lib/api/jolpica";
import type { QualifyingResult, RaceResult } from "@/lib/types";

export default async function RaceDetailPage({
  params,
}: {
  params: Promise<{ year: string; round: string }>;
}) {
  const { year, round } = await params;
  const races = await getSchedule(year);
  const raceInfo = races.find((race) => race.round === round) ?? null;

  const [raceResults, qualifyingResults, sprintResults] = await Promise.allSettled([
    getRaceResults(year, round),
    getQualifyingResults(year, round),
    getSprintResults(year, round),
  ]);

  return (
    <RaceDetailClient
      initialData={{
        raceInfo,
        raceResults: raceResults.status === "fulfilled" ? (raceResults.value as RaceResult[]) : [],
        qualifyingResults:
          qualifyingResults.status === "fulfilled" ? (qualifyingResults.value as QualifyingResult[]) : [],
        sprintResults: sprintResults.status === "fulfilled" ? (sprintResults.value as RaceResult[]) : [],
      }}
    />
  );
}
