"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { StintSummary } from "@/lib/stats/pace";
import type { LapSeriesPoint, PitstopMarker } from "@/lib/stats/lapAnalysis";
import LapTimeFallbackChart from "@/components/race/LapTimeFallbackChart";

interface TelemetryDriver {
  driverNumber: number;
  acronym: string;
  team: string;
  colour: string | null;
  stints: StintSummary[];
}

interface TelemetryResponse {
  available: boolean;
  reason?: string;
  race?: string;
  sessionName?: string;
  drivers?: TelemetryDriver[];
}

interface RaceLapsResponse {
  year: string;
  round: string;
  series: LapSeriesPoint[];
  pitstops: PitstopMarker[];
}

async function fetchTelemetry(year: string, round: string): Promise<TelemetryResponse> {
  const res = await fetch(`/api/telemetry?year=${year}&round=${round}`);
  if (!res.ok) throw new Error("Failed to fetch telemetry");
  return res.json() as Promise<TelemetryResponse>;
}

async function fetchRaceLaps(year: string, round: string): Promise<RaceLapsResponse> {
  const res = await fetch(`/api/race-laps?year=${year}&round=${round}`);
  if (!res.ok) throw new Error("Failed to fetch race laps");
  return res.json() as Promise<RaceLapsResponse>;
}

/** Seconds → "m:ss.mmm" lap-time string. */
function fmtLap(sec: number): string {
  if (!sec) return "–";
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(3).padStart(6, "0");
  return `${m}:${s}`;
}

function DegradationCell({ slope }: { slope: number }) {
  if (!slope) return <span className="text-muted-foreground">–</span>;
  const slowing = slope > 0;
  const tone = slowing ? "text-destructive" : "text-chart-5";
  return (
    <span className={`${tone} font-mono tabular-nums`}>
      {slowing ? "+" : ""}
      {slope.toFixed(3)} s/lap
    </span>
  );
}

export default function TelemetryPanel({
  year,
  round,
}: {
  year: string;
  round: string;
}) {
  const showFallback = Number(year) < 2023;

  const {
    data: fallback,
    isLoading: fallbackLoading,
    isError: fallbackError,
  } = useQuery({
    queryKey: ["race-laps", year, round],
    queryFn: () => fetchRaceLaps(year, round),
    enabled: showFallback,
    staleTime: 6 * 60 * 60 * 1000,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["telemetry", year, round],
    queryFn: () => fetchTelemetry(year, round),
    staleTime: 5 * 60 * 1000,
    enabled: !showFallback,
  });

  if (showFallback) {
    if (fallbackLoading) {
      return (
        <div className="space-y-2 mt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      );
    }

    if (fallbackError) {
      return (
        <p className="text-muted-foreground text-sm mt-4">
          Fallback lap chart could not be loaded. Please try again later.
        </p>
      );
    }

    if (!fallback?.series?.length) {
      return (
        <p className="text-muted-foreground text-sm mt-4">
          No telemetry available for this race. {" "}
          <span className="text-muted-foreground/70">
            Live timing data is provided by OpenF1 for 2023 onwards.
          </span>
        </p>
      );
    }

    return (
      <div className="mt-4">
        <LapTimeFallbackChart
          series={fallback?.series ?? []}
          pitstops={fallback?.pitstops ?? []}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2 mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-muted-foreground text-sm mt-4">
        Telemetry could not be loaded. Please try again later.
      </p>
    );
  }

  if (!data?.available || !data.drivers?.length) {
    return (
      <p className="text-muted-foreground text-sm mt-4">
        {data?.reason ?? "No telemetry available for this race."}{" "}
        <span className="text-muted-foreground/70">
          Live timing data is provided by OpenF1 for 2023 onwards.
        </span>
      </p>
    );
  }

  return (
    <div className="space-y-6 mt-2">
      <p className="text-xs text-muted-foreground">
        Showing{" "}
        <span className="font-semibold text-foreground">
          {data.sessionName ?? "Race"}
        </span>{" "}
        session telemetry · stint pace &amp; tyre degradation from OpenF1.
      </p>
      {data.drivers.map((d) => (
        <section key={d.driverNumber}>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-1 h-5 rounded-sm shrink-0"
              style={{ backgroundColor: d.colour ?? "var(--muted-foreground)" }}
              aria-hidden="true"
            />
            <span className="text-sm font-semibold">{d.acronym}</span>
            <span className="text-xs text-muted-foreground">{d.team}</span>
          </div>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-left border-b border-border">
                  <th className="font-medium py-1.5 pr-4">Stint</th>
                  <th className="font-medium py-1.5 pr-4">Compound</th>
                  <th className="font-medium py-1.5 pr-4 text-right">Laps</th>
                  <th className="font-medium py-1.5 pr-4 text-right">Avg</th>
                  <th className="font-medium py-1.5 text-right">Degradation</th>
                </tr>
              </thead>
              <tbody>
                {d.stints.map((s) => (
                  <tr key={s.stintNumber} className="border-b border-border/60">
                    <td className="py-1.5 pr-4 font-mono tabular-nums">{s.stintNumber}</td>
                    <td className="py-1.5 pr-4">
                      <Badge className="bg-surface-3 text-foreground text-[10px] px-1.5">
                        {s.compound}
                      </Badge>
                    </td>
                    <td className="py-1.5 pr-4 text-right font-mono tabular-nums">{s.laps}</td>
                    <td className="py-1.5 pr-4 text-right font-mono tabular-nums">
                      {fmtLap(s.avgSec)}
                    </td>
                    <td className="py-1.5 text-right">
                      <DegradationCell slope={s.degradationSlope} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
