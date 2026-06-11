"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Race, QualifyingResult, RaceResult } from "@/lib/types";
import { fetchJson } from "@/lib/api/clientFetch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TelemetryPanel from "@/components/race/TelemetryPanel";
import TeamRadioPanel from "@/components/race/TeamRadioPanel";
import CircuitMap from "@/components/race/CircuitMap";
import RaceTimesPanel from "@/components/race/RaceTimesPanel";
import ResultTable from "@/components/race/ResultTable";
import type { CircuitRecords as CircuitRecordsType } from "@/lib/stats/circuitRecords";
import { useIsClient } from "@/lib/hooks/useIsClient";
import { buildRaceStartTimes } from "@/lib/time/raceTime";
import { RADIO_AVAILABLE_FROM, RADIO_AVAILABLE_THROUGH } from "@/lib/constants";

type RaceDetailData = {
  raceInfo: Race | null;
  raceResults: RaceResult[];
  qualifyingResults: QualifyingResult[];
  sprintResults: RaceResult[];
};

async function fetchCircuitRecords(circuitId: string): Promise<CircuitRecordsType | null> {
  const body = await fetchJson<{ records?: CircuitRecordsType }>(`/api/circuit-records?circuitId=${encodeURIComponent(circuitId)}`);
  return body.records ?? null;
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
            <RaceTimesPanel
              venue={startTimes.venue}
              utc={startTimes.utc}
              browserLocal={browserLocal}
              circuitRecords={circuitRecords}
              circuitRecordsLoading={circuitRecordsLoading}
            />
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
