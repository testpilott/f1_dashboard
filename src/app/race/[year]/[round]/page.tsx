"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import type { Race, QualifyingResult, RaceResult } from "@/lib/types";
import { getTeamColor } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

async function fetchResults(season: string, round: string, type: "race" | "qualifying" | "sprint") {
  const res = await fetch(`/api/results?season=${season}&round=${round}&type=${type}`);
  if (!res.ok) throw new Error("Failed");
  const data = await res.json();
  return data.results as (RaceResult | QualifyingResult)[];
}

async function fetchRaceInfo(season: string, round: string) {
  const res = await fetch(`/api/schedule?season=${season}`);
  if (!res.ok) throw new Error("Failed");
  const data = await res.json();
  const races = data.races as Race[];
  return races.find((r) => r.round === round) ?? null;
}

function RaceResultTable({ season, round }: { season: string; round: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["race-results", season, round, "race"],
    queryFn: () => fetchResults(season, round, "race"),
    staleTime: 24 * 60 * 60 * 1000, // historical — cache for a day
  });

  if (isLoading) return <Skeleton className="h-64 w-full bg-zinc-800 mt-4" />;
  if (!data?.length) return <p className="text-zinc-500 text-sm mt-4">No results available.</p>;

  const results = data as RaceResult[];

  return (
    <Table className="mt-2">
      <TableHeader>
        <TableRow className="border-zinc-800 hover:bg-transparent">
          <TableHead className="text-zinc-500 w-12">Pos</TableHead>
          <TableHead className="text-zinc-500">Driver</TableHead>
          <TableHead className="text-zinc-500 hidden sm:table-cell">Constructor</TableHead>
          <TableHead className="text-zinc-500 text-right">Time / Status</TableHead>
          <TableHead className="text-zinc-500 text-right w-12">Pts</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.map((r) => {
          const team = r.Constructor?.name ?? "";
          return (
            <TableRow key={r.Driver.driverId} className="border-zinc-800 hover:bg-zinc-900/60">
              <TableCell className="py-2 font-mono text-sm">
                {r.positionText === "R" ? (
                  <Badge className="bg-red-900/50 text-red-400 border-red-900 text-xs px-1.5">DNF</Badge>
                ) : (
                  r.position
                )}
              </TableCell>
              <TableCell className="py-2">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: getTeamColor(team) }}
                  />
                  <span className="font-mono text-xs text-zinc-500 w-8 shrink-0">{r.Driver.code}</span>
                  <span className="text-sm">{r.Driver.givenName} {r.Driver.familyName}</span>
                  {r.FastestLap?.rank === "1" && (
                    <Badge className="bg-purple-900/60 text-purple-300 text-[10px] px-1 py-0">FL</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="py-2 text-zinc-400 text-sm hidden sm:table-cell">{team}</TableCell>
              <TableCell className="py-2 text-right font-mono text-xs text-zinc-400">
                {r.Time?.time ?? r.status}
              </TableCell>
              <TableCell className="py-2 text-right text-sm font-bold">{r.points}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function QualifyingResultTable({ season, round }: { season: string; round: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["race-results", season, round, "qualifying"],
    queryFn: () => fetchResults(season, round, "qualifying"),
    staleTime: 24 * 60 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-64 w-full bg-zinc-800 mt-4" />;
  if (!data?.length) return <p className="text-zinc-500 text-sm mt-4">No qualifying results available.</p>;

  const results = data as QualifyingResult[];

  return (
    <Table className="mt-2">
      <TableHeader>
        <TableRow className="border-zinc-800 hover:bg-transparent">
          <TableHead className="text-zinc-500 w-12">Pos</TableHead>
          <TableHead className="text-zinc-500">Driver</TableHead>
          <TableHead className="text-zinc-500 text-right">Q1</TableHead>
          <TableHead className="text-zinc-500 text-right">Q2</TableHead>
          <TableHead className="text-zinc-500 text-right">Q3</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.map((r) => {
          const team = r.Constructor?.name ?? "";
          return (
            <TableRow key={r.Driver.driverId} className="border-zinc-800 hover:bg-zinc-900/60">
              <TableCell className="py-2 font-mono text-sm">{r.position}</TableCell>
              <TableCell className="py-2">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: getTeamColor(team) }}
                  />
                  <span className="font-mono text-xs text-zinc-500 w-8">{r.Driver.code}</span>
                  <span className="text-sm">{r.Driver.givenName} {r.Driver.familyName}</span>
                </div>
              </TableCell>
              <TableCell className="py-2 text-right font-mono text-xs text-zinc-400">{r.Q1 ?? "–"}</TableCell>
              <TableCell className="py-2 text-right font-mono text-xs text-zinc-400">{r.Q2 ?? "–"}</TableCell>
              <TableCell className="py-2 text-right font-mono text-xs text-zinc-300">{r.Q3 ?? "–"}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default function RaceDetailPage() {
  const { year, round } = useParams<{ year: string; round: string }>();

  const { data: raceInfo } = useQuery({
    queryKey: ["race-info", year, round],
    queryFn: () => fetchRaceInfo(year, round),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const hasSprint = Boolean(raceInfo?.Sprint);

  return (
    <div>
      <div className="mb-6">
        {raceInfo ? (
          <>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
              Round {raceInfo.round} · {raceInfo.season}
            </p>
            <h1 className="text-2xl font-bold">{raceInfo.raceName}</h1>
            <p className="text-zinc-500 text-sm mt-1">
              {raceInfo.Circuit.circuitName} · {raceInfo.Circuit.Location.locality},{" "}
              {raceInfo.Circuit.Location.country}
            </p>
          </>
        ) : (
          <Skeleton className="h-12 w-64 bg-zinc-800" />
        )}
      </div>

      <Tabs defaultValue="race">
        <TabsList className="bg-zinc-900 mb-4">
          <TabsTrigger value="race" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
            Race
          </TabsTrigger>
          <TabsTrigger value="qualifying" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
            Qualifying
          </TabsTrigger>
          {hasSprint && (
            <TabsTrigger value="sprint" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              Sprint
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="race">
          <RaceResultTable season={year} round={round} />
        </TabsContent>
        <TabsContent value="qualifying">
          <QualifyingResultTable season={year} round={round} />
        </TabsContent>
        {hasSprint && (
          <TabsContent value="sprint">
            <RaceResultTable season={year} round={round} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
