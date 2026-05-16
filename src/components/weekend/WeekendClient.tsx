"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { OpenF1Meeting, OpenF1Session, OpenF1SessionResult, OpenF1Driver } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import TeamLogo from "@/components/ui/TeamLogo";
import RaceCalendar from "@/components/weekend/RaceCalendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

type WeekendData = {
  sessions: OpenF1Session[];
  resultsBySession: Record<number, OpenF1SessionResult[]>;
  driversBySession: Record<number, OpenF1Driver[]>;
};

async function fetchSessionsForMeeting(meetingKey: number) {
  const res = await fetch(`/api/sessions?endpoint=sessions&meeting_key=${meetingKey}`);
  if (!res.ok) throw new Error("Failed");
  const data = await res.json();
  return (Array.isArray(data.sessions) ? data.sessions : []) as OpenF1Session[];
}

async function fetchSessionResult(sessionKey: number) {
  const res = await fetch(`/api/sessions?endpoint=result&session_key=${sessionKey}`);
  if (!res.ok) throw new Error("Failed");
  const data = await res.json();
  return (Array.isArray(data.results) ? data.results : []) as OpenF1SessionResult[];
}

async function fetchSessionDrivers(sessionKey: number) {
  const res = await fetch(`/api/sessions?endpoint=drivers&session_key=${sessionKey}`);
  if (!res.ok) throw new Error("Failed");
  const data = await res.json();
  return (Array.isArray(data.drivers) ? data.drivers : []) as OpenF1Driver[];
}

const SESSION_ORDER = [
  "Practice 1",
  "Practice 2",
  "Practice 3",
  "Sprint Qualifying",
  "Sprint",
  "Qualifying",
  "Race",
];

function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "–";
  const s = ms / 1000;
  const mins = Math.floor(s / 60);
  const secs = (s % 60).toFixed(3).padStart(6, "0");
  return mins > 0 ? `${mins}:${secs}` : `${(s % 60).toFixed(3)}s`;
}

function SessionResults({
  sessionKey,
  sessionType,
  initialResults,
  initialDrivers,
}: {
  sessionKey: number;
  sessionType: string;
  initialResults?: OpenF1SessionResult[];
  initialDrivers?: OpenF1Driver[];
}) {
  const {
    data: results,
    isLoading: resultsLoading,
    isError: resultsError,
  } = useQuery({
    queryKey: ["session-result", sessionKey],
    queryFn: () => fetchSessionResult(sessionKey),
    staleTime: 5 * 60 * 1000,
    ...(initialResults ? { initialData: initialResults } : {}),
  });
  const {
    data: drivers,
    isLoading: driversLoading,
    isError: driversError,
  } = useQuery({
    queryKey: ["session-drivers", sessionKey],
    queryFn: () => fetchSessionDrivers(sessionKey),
    staleTime: 30 * 60 * 1000,
    ...(initialDrivers ? { initialData: initialDrivers } : {}),
  });

  const driverMap = new Map(drivers?.map((d) => [d.driver_number, d]) ?? []);

  if (resultsLoading || driversLoading) {
    return <Skeleton className="h-64 w-full bg-zinc-800 mt-4" />;
  }
  if (resultsError || driversError) {
    return <p className="text-zinc-500 text-sm mt-4">Failed to load session data.</p>;
  }
  if (!results?.length) {
    return <p className="text-zinc-500 text-sm mt-4">No results available yet for this session.</p>;
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4">
    <Table className="mt-2">
      <TableHeader>
        <TableRow className="border-zinc-800 hover:bg-transparent">
          <TableHead className="text-zinc-500 w-12">Pos</TableHead>
          <TableHead className="text-zinc-500">Driver</TableHead>
          <TableHead className="text-zinc-500 text-right">
            {sessionType === "Race" || sessionType === "Sprint" ? "Gap" : "Time"}
          </TableHead>
          <TableHead className="text-zinc-500 text-right w-10">Pts</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.map((r) => {
          const driver = driverMap.get(r.driver_number);
          return (
            <TableRow key={r.driver_number} className="border-zinc-800 hover:bg-zinc-900/60">
              <TableCell className="py-2 font-mono text-sm">
                {r.position ?? "–"}
              </TableCell>
              <TableCell className="py-2">
                <div className="flex items-center gap-2">
                  <TeamLogo team={driver?.team_name ?? ""} />
                  <span className="font-mono text-xs text-zinc-500 w-8 shrink-0">
                    {driver?.name_acronym ?? `#${r.driver_number}`}
                  </span>
                  <span className="text-sm">
                    {driver?.full_name ?? `Driver ${r.driver_number}`}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-2 text-right font-mono text-sm text-zinc-300">
                {r.gap_to_leader != null
                  ? r.gap_to_leader === 0
                    ? "Leader"
                    : typeof r.gap_to_leader === "number"
                      ? `+${r.gap_to_leader.toFixed(3)}s`
                      : String(r.gap_to_leader)
                  : r.duration != null && !Array.isArray(r.duration)
                  ? formatDuration(r.duration)
                  : "–"}
              </TableCell>
              <TableCell className="py-2 text-right text-sm text-zinc-400">
                –
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    </div>
  );
}

export default function WeekendClient({
  initialData,
  allMeetings = [],
}: {
  initialData: WeekendData;
  allMeetings?: OpenF1Meeting[];
}) {
  const latestMeetingKey = initialData.sessions[0]?.meeting_key ?? null;
  const [activeMeetingKey, setActiveMeetingKey] = useState<number | null>(null);

  // Single query — key changes when a different meeting is selected.
  // Uses server-prefetched initialData when viewing the latest meeting.
  const effectiveMeetingKey = activeMeetingKey ?? latestMeetingKey;

  const { data: rawSessions, isLoading } = useQuery({
    queryKey: ["sessions-meeting", effectiveMeetingKey],
    queryFn: () => fetchSessionsForMeeting(effectiveMeetingKey!),
    staleTime: 5 * 60 * 1000,
    initialData:
      effectiveMeetingKey === latestMeetingKey && initialData.sessions.length
        ? initialData.sessions
        : undefined,
    enabled: effectiveMeetingKey !== null,
  });

  const sorted = rawSessions
    ? [...rawSessions].sort(
        (a, b) => SESSION_ORDER.indexOf(a.session_name) - SESSION_ORDER.indexOf(b.session_name)
      )
    : [];

  const fallbackMeeting = {
    meeting_name: rawSessions?.[0]?.country_name ?? "Race Weekend",
    circuit_short_name: rawSessions?.[0]?.circuit_short_name ?? "",
    year: rawSessions?.[0]?.year ?? new Date().getFullYear(),
  };
  const meeting =
    allMeetings.find((m) => m.meeting_key === (activeMeetingKey ?? latestMeetingKey)) ??
    fallbackMeeting;

  const defaultTab =
    sorted.find((s) => s.session_name === "Race")?.session_key?.toString() ??
    sorted[sorted.length - 1]?.session_key?.toString() ??
    "";

  return (
    <div>
      {/* Meeting selector */}
      {allMeetings.length > 0 && (
        <RaceCalendar
          meetings={allMeetings}
          activeMeetingKey={activeMeetingKey ?? latestMeetingKey}
          onSelect={setActiveMeetingKey}
        />
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{meeting.meeting_name}</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {meeting.circuit_short_name} · {meeting.year}
        </p>
      </div>

      {isLoading && (
        <div>
          <Skeleton className="h-10 w-full bg-zinc-800 mb-4" />
          <Skeleton className="h-64 w-full bg-zinc-800" />
        </div>
      )}

      {!isLoading && sorted.length === 0 && (
        <p className="text-zinc-500">No session data available for this race weekend.</p>
      )}

      {!isLoading && sorted.length > 0 && (
        <Tabs defaultValue={defaultTab} key={activeMeetingKey ?? "latest"}>
          <div className="overflow-x-auto -mx-4 px-4">
          <TabsList className="bg-zinc-900 flex-nowrap w-max min-w-full gap-1 mb-4">
            {sorted.map((s) => (
              <TabsTrigger
                key={s.session_key}
                value={s.session_key.toString()}
                className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-xs"
              >
                {s.session_name}
                {s.date_start && (
                  <span className="ml-1 text-zinc-500 text-[10px]">
                    {format(new Date(s.date_start), "d MMM")}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          </div>

          {sorted.map((s) => (
            <TabsContent key={s.session_key} value={s.session_key.toString()}>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-semibold">{s.session_name}</h2>
                <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">
                  {s.session_type}
                </Badge>
              </div>
              <SessionResults
                sessionKey={s.session_key}
                sessionType={s.session_name}
                initialResults={effectiveMeetingKey === latestMeetingKey ? initialData.resultsBySession[s.session_key] : undefined}
                initialDrivers={effectiveMeetingKey === latestMeetingKey ? initialData.driversBySession[s.session_key] : undefined}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
