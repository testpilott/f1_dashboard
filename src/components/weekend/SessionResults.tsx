"use client";

import { useQuery } from "@tanstack/react-query";
import type { OpenF1SessionResult, OpenF1Driver } from "@/lib/types";
import { fetchJson } from "@/lib/api/clientFetch";
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

function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "–";
  const s = ms / 1000;
  const mins = Math.floor(s / 60);
  const secs = (s % 60).toFixed(3).padStart(6, "0");
  return mins > 0 ? `${mins}:${secs}` : `${(s % 60).toFixed(3)}s`;
}

async function fetchSessionResult(sessionKey: number) {
  const data = await fetchJson<{ results?: OpenF1SessionResult[] }>(
    `/api/sessions/result?session_key=${sessionKey}`,
  );
  return (Array.isArray(data.results) ? data.results : []) as OpenF1SessionResult[];
}

async function fetchSessionDrivers(sessionKey: number) {
  const data = await fetchJson<{ drivers?: OpenF1Driver[] }>(
    `/api/sessions/drivers?session_key=${sessionKey}`,
  );
  return (Array.isArray(data.drivers) ? data.drivers : []) as OpenF1Driver[];
}

export default function SessionResults({
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
  const { data: results, isLoading: resultsLoading, isError: resultsError } = useQuery({
    queryKey: ["session-result", sessionKey],
    queryFn: () => fetchSessionResult(sessionKey),
    staleTime: 5 * 60 * 1000,
    ...(initialResults ? { initialData: initialResults } : {}),
  });
  const { data: drivers, isLoading: driversLoading, isError: driversError } = useQuery({
    queryKey: ["session-drivers", sessionKey],
    queryFn: () => fetchSessionDrivers(sessionKey),
    staleTime: 30 * 60 * 1000,
    ...(initialDrivers ? { initialData: initialDrivers } : {}),
  });

  const driverMap = new Map(drivers?.map((d) => [d.driver_number, d]) ?? []);

  if (resultsLoading || driversLoading) return <Skeleton className="h-64 w-full mt-4" />;
  if (resultsError || driversError)
    return <p className="text-muted-foreground text-sm mt-4">Failed to load session data.</p>;
  if (!results?.length)
    return (
      <p className="text-muted-foreground text-sm mt-4">
        No results available yet for this session.
      </p>
    );

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <Table className="mt-2">
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground w-12">Pos</TableHead>
            <TableHead className="text-muted-foreground">Driver</TableHead>
            <TableHead className="text-muted-foreground text-right">
              {sessionType === "Race" || sessionType === "Sprint" ? "Gap" : "Time"}
            </TableHead>
            <TableHead className="text-muted-foreground text-right w-10">Pts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((r) => {
            const driver = driverMap.get(r.driver_number);
            return (
              <TableRow key={r.driver_number} className="border-border hover:bg-accent/40">
                <TableCell className="py-2 font-mono text-sm">{r.position ?? "–"}</TableCell>
                <TableCell className="py-2">
                  <div className="flex items-center gap-2">
                    <TeamLogo team={driver?.team_name ?? ""} />
                    <span className="font-mono text-xs text-muted-foreground w-8 shrink-0 tabular-nums">
                      {driver?.name_acronym ?? `#${r.driver_number}`}
                    </span>
                    <span className="text-sm">
                      {driver?.full_name ?? `Driver ${r.driver_number}`}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-2 text-right font-mono text-sm tabular-nums text-foreground/80">
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
                <TableCell className="py-2 text-right text-sm text-muted-foreground">–</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
