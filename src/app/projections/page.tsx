"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ChampionshipProjection, DriverProjection, ConstructorProjection } from "@/lib/types";
import { fetchJson } from "@/lib/api/clientFetch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectedPointsBar, ProbabilityGrid, useRevealOnMount } from "@/components/projections/ProjectionBars";

type ProjectionsUnavailable = { available: false; reason?: string };
type ProjectionsResponse = ChampionshipProjection | ProjectionsUnavailable;
type ProjectionView = "drivers" | "constructors";

function normalizeView(value: string | null): ProjectionView {
  return value === "constructors" ? "constructors" : "drivers";
}

function isAvailable(data: ProjectionsResponse | undefined): data is ChampionshipProjection {
  return !!data && Array.isArray((data as ChampionshipProjection).drivers);
}

async function fetchProjections(): Promise<ProjectionsResponse> {
  return fetchJson<ProjectionsResponse>("/api/projections");
}

function ProjectionRow({ driver, maxWinProb }: { driver: DriverProjection; maxWinProb: number }) {
  const ready = useRevealOnMount();

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

      <ProjectedPointsBar
        p10={driver.projectedPoints.p10}
        p50={driver.projectedPoints.p50}
        p90={driver.projectedPoints.p90}
        color={driver.teamColour}
      />

      <ProbabilityGrid
        color={driver.teamColour}
        ready={ready}
        items={[
          { label: "Win title", value: Math.min((driver.winProbability / maxWinProb) * 100, 100), display: `${driver.winProbability.toFixed(1)}%` },
          { label: "Podium finish", value: Math.min(driver.podiumProbability, 100), display: `${driver.podiumProbability.toFixed(1)}%` },
          { label: "Top 5", value: Math.min(driver.top5Probability, 100), display: `${driver.top5Probability.toFixed(1)}%` },
        ]}
      />
    </div>
  );
}

function ConstructorProjectionRow({
  constructor,
  maxChampionProb,
}: {
  constructor: ConstructorProjection;
  maxChampionProb: number;
}) {
  const ready = useRevealOnMount();

  return (
    <div className="rounded-lg bg-surface-2 border border-border p-4 space-y-3 hover:bg-accent/10 transition-colors">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ backgroundColor: constructor.teamColour }}
          />
          <span className="font-semibold text-sm min-w-0 truncate">{constructor.constructorName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm font-mono tabular-nums">{Math.round(constructor.currentPoints)} pts</span>
          <Badge className="bg-surface-3 border-border text-foreground/80 text-xs font-mono px-2">
            P50: {Math.round(constructor.projectedPoints.p50)}
          </Badge>
        </div>
      </div>

      <ProjectedPointsBar
        p10={constructor.projectedPoints.p10}
        p50={constructor.projectedPoints.p50}
        p90={constructor.projectedPoints.p90}
        color={constructor.teamColour}
      />

      <ProbabilityGrid
        color={constructor.teamColour}
        ready={ready}
        items={[
          {
            label: "Win title",
            value: Math.min((constructor.championProbability / maxChampionProb) * 100, 100),
            display: `${constructor.championProbability.toFixed(1)}%`,
          },
          {
            label: "Top 3",
            value: Math.min(constructor.top3Probability, 100),
            display: `${constructor.top3Probability.toFixed(1)}%`,
          },
          {
            label: "Top 5",
            value: Math.min(constructor.top5Probability, 100),
            display: `${constructor.top5Probability.toFixed(1)}%`,
          },
        ]}
      />
    </div>
  );
}

export default function ProjectionsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [activeView, setActiveView] = useState<ProjectionView>(() => normalizeView(searchParams.get("view")));

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["projections"],
    queryFn: fetchProjections,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours — matches the server-side daily cache
  });

  useEffect(() => {
    setActiveView(normalizeView(searchParams.get("view")));
  }, [searchParams]);

  const available = isAvailable(data);
  const projection = available ? data : undefined;
  const unavailableReason =
    !available && data && "reason" in data ? data.reason : undefined;

  // Guard against division-by-zero: if every driver has 0% win probability
  // (e.g. season not started), use 1 so bars render at 0% rather than NaN.
  const maxWinProb = Math.max(projection?.drivers[0]?.winProbability ?? 0, 1);
  const maxChampionProb = Math.max(projection?.constructors[0]?.championProbability ?? 0, 1);

  function onViewChange(next: string) {
    const normalized = normalizeView(next);
    setActiveView(normalized);

    const params = new URLSearchParams(searchParams.toString());
    if (normalized === "drivers") {
      params.delete("view");
    } else {
      params.set("view", normalized);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Championship Projections</h1>
        {projection && (
          <p className="text-muted-foreground text-sm mt-1">
            {projection.totalSimulations.toLocaleString()} Monte Carlo simulations ·{" "}
            {projection.remainingRaces} race weekends remaining
            {typeof projection.remainingSprintWeekends === "number"
              ? ` (${projection.remainingSprintWeekends} sprint weekends)`
              : ""} · generated{" "}
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
        <Tabs value={activeView} onValueChange={onViewChange} className="w-full">
          <TabsList className="mb-4 bg-surface-2">
            <TabsTrigger value="drivers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Drivers
            </TabsTrigger>
            <TabsTrigger value="constructors" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Constructors
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drivers">
            <div className="space-y-3">
              {projection.drivers.map((driver) => (
                <ProjectionRow key={driver.driverId} driver={driver} maxWinProb={maxWinProb} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="constructors">
            {projection.constructors.length === 0 ? (
              <p className="text-muted-foreground text-sm py-2">No constructor projections available yet.</p>
            ) : (
              <div className="space-y-3">
                {projection.constructors.map((constructor) => (
                  <ConstructorProjectionRow
                    key={constructor.constructorId}
                    constructor={constructor}
                    maxChampionProb={maxChampionProb}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
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
