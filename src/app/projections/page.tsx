"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { ChampionshipProjection, DriverProjection } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";


type ProjectionsUnavailable = { available: false; reason?: string };
type ProjectionsResponse = ChampionshipProjection | ProjectionsUnavailable;

function isAvailable(data: ProjectionsResponse | undefined): data is ChampionshipProjection {
  return !!data && Array.isArray((data as ChampionshipProjection).drivers);
}

async function fetchProjections(): Promise<ProjectionsResponse> {
  const res = await fetch("/api/projections");
  if (!res.ok) throw new Error("Failed");
  return res.json() as Promise<ProjectionsResponse>;
}

function ProjectionRow({ driver, maxWinProb }: { driver: DriverProjection; maxWinProb: number }) {
  // Animate bars from 0 → actual width on first render
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Guard against division-by-zero when all drivers have p90 = 0 or
  // when the season just started and no projections exist yet.
  const p90Scaled = Math.max(driver.projectedPoints.p90 * 1.1, 1);

  return (
    <div className="rounded-lg bg-surface-2 border border-border p-4 space-y-3 hover:bg-accent/10 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ backgroundColor: driver.teamColour }}
          />
          <span className="font-mono text-xs text-muted-foreground w-8 tabular-nums">{driver.driverCode}</span>
          <span className="font-semibold text-sm min-w-0 truncate">{driver.fullName}</span>
          <span className="text-xs text-muted-foreground shrink-0">{driver.teamName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm font-mono tabular-nums">{Math.round(driver.currentPoints)} pts</span>
          <Badge className="bg-surface-3 border-border text-foreground/80 text-xs font-mono px-2">
            P50: {Math.round(driver.projectedPoints.p50)}
          </Badge>
        </div>
      </div>

      {/* Point range bar */}
      <div
        className="relative h-2 rounded bg-surface-3 overflow-hidden cursor-help"
        title={`P10: ${Math.round(driver.projectedPoints.p10)} pts · P50: ${Math.round(driver.projectedPoints.p50)} pts · P90: ${Math.round(driver.projectedPoints.p90)} pts`}
      >
            {/* p10–p90 range */}
            <div
              className="absolute top-0 bottom-0 rounded opacity-30"
              style={{
                left: `${(driver.projectedPoints.p10 / p90Scaled) * 100}%`,
                right: `${100 - (driver.projectedPoints.p90 / p90Scaled) * 100}%`,
                backgroundColor: driver.teamColour,
              }}
            />
            {/* p50 marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 rounded"
              style={{
                left: `${(driver.projectedPoints.p50 / p90Scaled) * 100}%`,
                backgroundColor: driver.teamColour,
              }}
            />
        </div>

      {/* Probabilities */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Win title", value: Math.min((driver.winProbability / maxWinProb) * 100, 100), display: `${driver.winProbability.toFixed(1)}%` },
          { label: "Podium finish", value: Math.min(driver.podiumProbability, 100), display: `${driver.podiumProbability.toFixed(1)}%` },
          { label: "Top 5", value: Math.min(driver.top5Probability, 100), display: `${driver.top5Probability.toFixed(1)}%` },
        ].map(({ label, value, display }) => (
          <div key={label}>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-mono">{display}</span>
            </div>
            <div className="relative h-1.5 rounded-full bg-surface-3 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: ready ? `${value}%` : "0%",
                  backgroundColor: driver.teamColour,
                  transition: "width 0.7s ease-out",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProjectionsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["projections"],
    queryFn: fetchProjections,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours — matches the server-side daily cache
  });

  const available = isAvailable(data);
  const projection = available ? data : undefined;
  const unavailableReason =
    !available && data && "reason" in data ? data.reason : undefined;

  // Guard against division-by-zero: if every driver has 0% win probability
  // (e.g. season not started), use 1 so bars render at 0% rather than NaN.
  const maxWinProb = Math.max(projection?.drivers[0]?.winProbability ?? 0, 1);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Championship Projections</h1>
        {projection && (
          <p className="text-muted-foreground text-sm mt-1">
            {projection.totalSimulations.toLocaleString()} Monte Carlo simulations ·{" "}
            {projection.remainingRaces} races remaining · generated{" "}
            {new Date(projection.generatedAt).toLocaleTimeString()}
          </p>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-3 py-8">
          <p className="text-muted-foreground text-sm">Failed to compute projections.</p>
          <button onClick={() => refetch()} className="text-xs text-primary hover:underline">
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && !available && data && (
        <div className="flex items-center gap-3 py-8">
          <p className="text-muted-foreground text-sm">
            {unavailableReason ?? "Projections are warming up — check back shortly."}
          </p>
          <button onClick={() => refetch()} className="text-xs text-primary hover:underline">
            Retry
          </button>
        </div>
      )}

      {projection && (
        <div className="space-y-3">
          {projection.drivers.map((driver) => (
            <ProjectionRow key={driver.driverId} driver={driver} maxWinProb={maxWinProb} />
          ))}
        </div>
      )}

      <div className="mt-6 p-4 rounded-lg bg-surface-2 border border-border">
        <h3 className="text-sm font-semibold mb-2">About the model</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Projections use a Monte Carlo simulation that runs {(10_000).toLocaleString()} race simulations
          for each remaining round. Each driver&apos;s expected finish is drawn from a normal
          distribution centred on their season average, with realistic variance. Points are awarded
          per the 2026 scoring system (25-18-15…). Fastest-lap bonus is simulated stochastically.
          Sprint weekends run both a sprint and main race simulation. Percentile bands (P10–P90)
          show the range of plausible final championship points.
        </p>
      </div>
    </div>
  );
}
