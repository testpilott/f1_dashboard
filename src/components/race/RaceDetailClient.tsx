"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Race, QualifyingResult, RaceResult } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import TeamLogo from "@/components/ui/TeamLogo";
import { Skeleton } from "@/components/ui/skeleton";
import TelemetryPanel from "@/components/race/TelemetryPanel";
import TeamRadioPanel from "@/components/race/TeamRadioPanel";
import CircuitMap from "@/components/race/CircuitMap";
import CircuitRecords from "@/components/race/CircuitRecords";
import RaceStartTimes from "@/components/race/RaceStartTimes";
import type { CircuitRecords as CircuitRecordsType } from "@/lib/stats/circuitRecords";
import { useIsClient } from "@/lib/hooks/useIsClient";
import { buildRaceStartTimes } from "@/lib/time/raceTime";
import { getStatusLabel, getStatusTooltip, RADIO_AVAILABLE_FROM, RADIO_AVAILABLE_THROUGH } from "@/lib/constants";
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

async function fetchCircuitRecords(circuitId: string): Promise<CircuitRecordsType | null> {
  const res = await fetch(`/api/circuit-records?circuitId=${encodeURIComponent(circuitId)}`);
  if (!res.ok) throw new Error("Failed to fetch circuit records");
  const body = (await res.json()) as { records?: CircuitRecordsType };
  return body.records ?? null;
}

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

  if (!data || !Array.isArray(data) || data.length === 0) {
    return <p className="text-muted-foreground text-sm mt-4">No {title.toLowerCase()} available.</p>;
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4">
    <Table className="mt-2">
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          <TableHead className="text-muted-foreground w-12">Pos</TableHead>
          <TableHead className="text-muted-foreground">Driver</TableHead>
          {type === "qualifying" ? (
            <>
              <TableHead className="text-muted-foreground text-right">Q1</TableHead>
              <TableHead className="text-muted-foreground text-right">Q2</TableHead>
              <TableHead className="text-muted-foreground text-right">Q3</TableHead>
            </>
          ) : (
            <>
              <TableHead className="text-muted-foreground hidden sm:table-cell">Constructor</TableHead>
              <TableHead className="text-muted-foreground text-right">Time / Status</TableHead>
              <TableHead className="text-muted-foreground text-right w-12">Pts</TableHead>
            </>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {type === "qualifying"
          ? (data as QualifyingResult[]).map((r) => (
            <TableRow key={r.Driver.driverId} className="border-border hover:bg-accent/40">
              <TableCell className="py-2 font-mono text-sm tabular-nums">{r.position}</TableCell>
              <TableCell className="py-2">
                <div className="flex items-center gap-2">
                  <TeamLogo team={r.Constructor?.name ?? ""} />
                  <span className="font-mono text-xs text-muted-foreground w-8 tabular-nums">{r.Driver.code}</span>
                  <span className="text-sm">
                    {r.Driver.givenName} {r.Driver.familyName}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-2 text-right font-mono text-xs text-muted-foreground tabular-nums">{r.Q1 ?? "–"}</TableCell>
              <TableCell className="py-2 text-right font-mono text-xs text-muted-foreground tabular-nums">{r.Q2 ?? "–"}</TableCell>
              <TableCell className="py-2 text-right font-mono text-xs tabular-nums">{r.Q3 ?? "–"}</TableCell>
            </TableRow>
          ))
          : (data as RaceResult[]).map((r) => (
            <TableRow key={r.Driver.driverId} className="border-border hover:bg-accent/40">
              <TableCell className="py-2 font-mono text-sm tabular-nums">
                {r.positionText && /^[A-Z]$/.test(r.positionText) && r.positionText !== "1" ? (
                  <Tooltip>
                    <TooltipTrigger render={<Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs px-1.5 cursor-help" />}>
                      {getStatusLabel(r.positionText)}
                    </TooltipTrigger>
                    <TooltipContent>{getStatusTooltip(r.positionText)}</TooltipContent>
                  </Tooltip>
                ) : (
                  r.position
                )}
              </TableCell>
              <TableCell className="py-2">
                <div className="flex items-center gap-2">
                  <TeamLogo team={r.Constructor?.name ?? ""} />
                  <span className="font-mono text-xs text-muted-foreground w-8 shrink-0 tabular-nums">{r.Driver.code}</span>
                  <span className="text-sm">
                    {r.Driver.givenName} {r.Driver.familyName}
                  </span>
                  {r.FastestLap?.rank === "1" && (
                    <Badge className="bg-accent-2/20 text-accent-2 text-[10px] px-1 py-0">FL</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="py-2 text-muted-foreground text-sm hidden sm:table-cell">
                {r.Constructor?.name ?? ""}
              </TableCell>
              <TableCell className="py-2 text-right font-mono text-xs text-muted-foreground tabular-nums">
                {"Time" in r ? r.Time?.time ?? r.status : "–"}
              </TableCell>
              <TableCell className="py-2 text-right text-sm font-bold">
                {r.points}
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
    </div>
  );
}

export default function RaceDetailClient({
  initialData,
  initialTab,
}: {
  initialData: RaceDetailData;
  initialTab?: string;
}) {
  const raceInfo = initialData.raceInfo;

  const hasSprint = Boolean(raceInfo?.Sprint);
  const season = Number(raceInfo?.season ?? 0);
  const hasRadio = season >= RADIO_AVAILABLE_FROM && season <= RADIO_AVAILABLE_THROUGH;
  const isClient = useIsClient();

  const startTimes = useMemo(() => {
    if (!raceInfo) return { venue: null, utc: null };
    return buildRaceStartTimes(
      raceInfo.date,
      raceInfo.time ?? null,
      raceInfo.Circuit.circuitId
    );
  }, [raceInfo]);

  const browserLocal = useMemo(() => {
    if (!isClient || !raceInfo?.time) return null;
    const d = new Date(`${raceInfo.date}T${raceInfo.time}`);
    if (isNaN(d.getTime())) return null;
    return (
      new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: false,
        timeZoneName: "short",
      }).format(d)
    );
  }, [isClient, raceInfo]);

  const { data: circuitRecords, isLoading: circuitRecordsLoading } = useQuery({
    queryKey: ["circuit-records", raceInfo?.Circuit.circuitId],
    queryFn: () => fetchCircuitRecords(raceInfo!.Circuit.circuitId),
    enabled: Boolean(raceInfo?.Circuit.circuitId),
    staleTime: 6 * 60 * 60 * 1000,
  });

  return (
    <div>
      <div className="mb-6">
        {raceInfo ? (
          <>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Round {raceInfo.round} · {raceInfo.season}
            </p>
            <h1 className="text-2xl font-bold">{raceInfo.raceName}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {raceInfo.Circuit.circuitName} · {raceInfo.Circuit.Location.locality},{" "}
              {raceInfo.Circuit.Location.country}
            </p>
            <div className="mt-3 space-y-2">
              <RaceStartTimes
                venue={startTimes.venue}
                utc={startTimes.utc}
                browserLocal={browserLocal}
              />
              {circuitRecordsLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <CircuitRecords records={circuitRecords} />
              )}
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">Race details unavailable.</p>
        )}
      </div>

      <Tabs defaultValue={initialTab === "circuit" ? "circuit" : "race"}>
        <TabsList className="bg-surface-2 mb-4">
          <TabsTrigger value="race" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Race
          </TabsTrigger>
          <TabsTrigger value="qualifying" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Qualifying
          </TabsTrigger>
          {hasSprint && (
            <TabsTrigger value="sprint" className="data-[state=active]:bg-accent-2 data-[state=active]:text-accent-2-foreground">
              Sprint
            </TabsTrigger>
          )}
          {raceInfo && (
            <TabsTrigger value="telemetry" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Telemetry
            </TabsTrigger>
          )}
          {raceInfo && hasRadio && (
            <TabsTrigger value="radio" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Radio
            </TabsTrigger>
          )}
          {raceInfo && (
            <TabsTrigger value="circuit" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Circuit
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
        {raceInfo && (
          <TabsContent value="telemetry">
            <TelemetryPanel year={raceInfo.season} round={raceInfo.round} />
          </TabsContent>
        )}
        {raceInfo && hasRadio && (
          <TabsContent value="radio">
            <TeamRadioPanel year={raceInfo.season} round={raceInfo.round} />
          </TabsContent>
        )}
        {raceInfo && (
          <TabsContent value="circuit">
            <CircuitMap year={raceInfo.season} round={raceInfo.round} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
