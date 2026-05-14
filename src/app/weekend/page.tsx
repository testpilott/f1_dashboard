"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { OpenF1Session, OpenF1SessionResult, OpenF1Driver } from "@/lib/types";
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
import { format } from "date-fns";

async function fetchSessions() {
  const res = await fetch("/api/sessions?endpoint=sessions&meeting_key=latest");
  if (!res.ok) throw new Error("Failed");
  const data = await res.json();
  return data.sessions as OpenF1Session[];
}

async function fetchSessionResult(sessionKey: number) {
  const res = await fetch(`/api/sessions?endpoint=result&session_key=${sessionKey}`);
  if (!res.ok) throw new Error("Failed");
  const data = await res.json();
  return data.results as OpenF1SessionResult[];
}

async function fetchSessionDrivers(sessionKey: number) {
  const res = await fetch(`/api/sessions?endpoint=drivers&session_key=${sessionKey}`);
  if (!res.ok) throw new Error("Failed");
  const data = await res.json();
  return data.drivers as OpenF1Driver[];
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
  const secs = (s % 60).toFixed(3);
  return mins > 0 ? `${mins}:${secs.padStart(6, "0")}` : `${secs}`;
}

function SessionResults({ sessionKey, sessionType }: { sessionKey: number; sessionType: string }) {
  const { data: results, isLoading } = useQuery({
    queryKey: ["session-result", sessionKey],
    queryFn: () => fetchSessionResult(sessionKey),
    staleTime: 5 * 60 * 1000,
  });
  const { data: drivers } = useQuery({
    queryKey: ["session-drivers", sessionKey],
    queryFn: () => fetchSessionDrivers(sessionKey),
    staleTime: 30 * 60 * 1000,
  });

  const driverMap = new Map(drivers?.map((d) => [d.driver_number, d]) ?? []);

  if (isLoading) return <Skeleton className="h-64 w-full bg-zinc-800 mt-4" />;
  if (!results?.length) return <p className="text-zinc-500 text-sm mt-4">No results available yet for this session.</p>;

  return (
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
          const teamColor = getTeamColor(driver?.team_name ?? "");
          return (
            <TableRow key={r.driver_number} className="border-zinc-800 hover:bg-zinc-900/60">
              <TableCell className="py-2 font-mono text-sm">
                {r.position ?? "–"}
              </TableCell>
              <TableCell className="py-2">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: teamColor }}
                  />
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
  );
}

export default function WeekendPage() {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions-latest"],
    queryFn: fetchSessions,
    staleTime: 5 * 60 * 1000,
  });

  const sorted = sessions
    ? [...sessions].sort(
        (a, b) => SESSION_ORDER.indexOf(a.session_name) - SESSION_ORDER.indexOf(b.session_name)
      )
    : [];

  const meeting = sessions?.[0];
  const [activeTab, setActiveTab] = useState<string>("Race");

  const defaultTab = sorted.find((s) => s.session_name === "Race")?.session_key?.toString()
    ?? sorted[sorted.length - 1]?.session_key?.toString()
    ?? "";

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-8 w-64 bg-zinc-800 mb-6" />
        <Skeleton className="h-10 w-full bg-zinc-800 mb-4" />
        <Skeleton className="h-64 w-full bg-zinc-800" />
      </div>
    );
  }

  if (!sorted.length) {
    return <p className="text-zinc-500">No session data available. Check back after the next session.</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{meeting?.country_name ?? "Race Weekend"}</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {meeting?.circuit_short_name ?? ""} · {meeting?.year ?? ""}
        </p>
      </div>

      <Tabs defaultValue={defaultTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 flex-wrap h-auto gap-1 mb-4">
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

        {sorted.map((s) => (
          <TabsContent key={s.session_key} value={s.session_key.toString()}>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-lg font-semibold">{s.session_name}</h2>
              <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">
                {s.session_type}
              </Badge>
            </div>
            <SessionResults sessionKey={s.session_key} sessionType={s.session_name} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
