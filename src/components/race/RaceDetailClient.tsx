"use client";

import type { Race, QualifyingResult, RaceResult } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import TeamLogo from "@/components/ui/TeamLogo";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ResultData = RaceResult[] | QualifyingResult[];

type RaceDetailData = {
  raceInfo: Race | null;
  raceResults: RaceResult[];
  qualifyingResults: QualifyingResult[];
  sprintResults: RaceResult[];
};

function ResultTable({
  type,
  title,
  initialData,
}: {
  type: "race" | "qualifying" | "sprint";
  title: string;
  initialData?: ResultData;
}) {
  const data = initialData;
  const isLoading = false;
  const isError = false;

  if (isLoading) return <Skeleton className="h-64 w-full bg-zinc-800 mt-4" />;
  if (isError) return <p className="text-zinc-500 text-sm mt-4">Failed to load {title.toLowerCase()}.</p>;
  if (!data?.length) return <p className="text-zinc-500 text-sm mt-4">No {title.toLowerCase()} available.</p>;

  return (
    <Table className="mt-2">
      <TableHeader>
        <TableRow className="border-zinc-800 hover:bg-transparent">
          <TableHead className="text-zinc-500 w-12">Pos</TableHead>
          <TableHead className="text-zinc-500">Driver</TableHead>
          {type === "qualifying" ? (
            <>
              <TableHead className="text-zinc-500 text-right">Q1</TableHead>
              <TableHead className="text-zinc-500 text-right">Q2</TableHead>
              <TableHead className="text-zinc-500 text-right">Q3</TableHead>
            </>
          ) : (
            <>
              <TableHead className="text-zinc-500 hidden sm:table-cell">Constructor</TableHead>
              <TableHead className="text-zinc-500 text-right">Time / Status</TableHead>
              <TableHead className="text-zinc-500 text-right w-12">Pts</TableHead>
            </>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {type === "qualifying"
          ? (data as QualifyingResult[]).map((r) => (
            <TableRow key={r.Driver.driverId} className="border-zinc-800 hover:bg-zinc-900/60">
              <TableCell className="py-2 font-mono text-sm">{r.position}</TableCell>
              <TableCell className="py-2">
                <div className="flex items-center gap-2">
                  <TeamLogo team={r.Constructor?.name ?? ""} />
                  <span className="font-mono text-xs text-zinc-500 w-8">{r.Driver.code}</span>
                  <span className="text-sm">
                    {r.Driver.givenName} {r.Driver.familyName}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-2 text-right font-mono text-xs text-zinc-400">{r.Q1 ?? "–"}</TableCell>
              <TableCell className="py-2 text-right font-mono text-xs text-zinc-400">{r.Q2 ?? "–"}</TableCell>
              <TableCell className="py-2 text-right font-mono text-xs text-zinc-300">{r.Q3 ?? "–"}</TableCell>
            </TableRow>
          ))
          : (data as RaceResult[]).map((r) => (
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
                  <TeamLogo team={r.Constructor?.name ?? ""} />
                  <span className="font-mono text-xs text-zinc-500 w-8 shrink-0">{r.Driver.code}</span>
                  <span className="text-sm">
                    {r.Driver.givenName} {r.Driver.familyName}
                  </span>
                  {r.FastestLap?.rank === "1" && (
                    <Badge className="bg-purple-900/60 text-purple-300 text-[10px] px-1 py-0">FL</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="py-2 text-zinc-400 text-sm hidden sm:table-cell">
                {r.Constructor?.name ?? ""}
              </TableCell>
              <TableCell className="py-2 text-right font-mono text-xs text-zinc-400">
                {"Time" in r ? r.Time?.time ?? r.status : "–"}
              </TableCell>
              <TableCell className="py-2 text-right text-sm font-bold">
                {r.points}
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}

export default function RaceDetailClient({
  initialData,
}: {
  initialData: RaceDetailData;
}) {
  const raceInfo = initialData.raceInfo;

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
          <p className="text-zinc-500 text-sm">Race details unavailable.</p>
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
          <ResultTable
            type="race"
            title="Race results"
            initialData={initialData.raceResults}
          />
        </TabsContent>
        <TabsContent value="qualifying">
          <ResultTable
            type="qualifying"
            title="Qualifying results"
            initialData={initialData.qualifyingResults}
          />
        </TabsContent>
        {hasSprint && (
          <TabsContent value="sprint">
            <ResultTable
              type="sprint"
              title="Sprint results"
              initialData={initialData.sprintResults}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
