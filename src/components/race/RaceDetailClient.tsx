"use client";

import type { Race, QualifyingResult, RaceResult } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import TeamLogo from "@/components/ui/TeamLogo";
import TelemetryPanel from "@/components/race/TelemetryPanel";
import TeamRadioPanel from "@/components/race/TeamRadioPanel";
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
}: {
  initialData: RaceDetailData;
}) {
  const raceInfo = initialData.raceInfo;

  const hasSprint = Boolean(raceInfo?.Sprint);
  const season = Number(raceInfo?.season ?? 0);
  const hasRadio = season >= RADIO_AVAILABLE_FROM && season <= RADIO_AVAILABLE_THROUGH;

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
          </>
        ) : (
          <p className="text-muted-foreground text-sm">Race details unavailable.</p>
        )}
      </div>

      <Tabs defaultValue="race">
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
      </Tabs>
    </div>
  );
}
