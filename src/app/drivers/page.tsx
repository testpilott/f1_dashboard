"use client";

import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DriverStanding, NewsItem } from "@/lib/types";
import { getTeamColor } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import DriverHeadshot, { type DriverPhotoEntry } from "@/components/drivers/DriverHeadshot";
import DriverDetailPanel, { type DriverSeasonData } from "@/components/drivers/DriverDetailPanel";

async function fetchStandings() {
  const res = await fetch("/api/standings?season=current");
  if (!res.ok) throw new Error("Failed to load standings");
  const d = await res.json();
  return (Array.isArray(d.drivers) ? d.drivers : []) as DriverStanding[];
}

async function fetchDriverNews(lastName: string): Promise<NewsItem[]> {
  const res = await fetch(`/api/news?filter=${encodeURIComponent(lastName.toLowerCase())}`);
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d.items) ? d.items : [];
}

async function fetchDriverPhotos(): Promise<DriverPhotoEntry[]> {
  const res = await fetch("/api/driver-photos");
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d.photos) ? d.photos : [];
}

async function fetchDriverSeason(driverId: string): Promise<DriverSeasonData> {
  const res = await fetch(`/api/driver-season?season=current&driverId=${encodeURIComponent(driverId)}`);
  if (!res.ok) throw new Error("Failed to load season stats");
  return res.json() as Promise<DriverSeasonData>;
}

export default function DriversPage() {
  const [selected, setSelected] = useState<DriverStanding | null>(null);

  const { data: drivers, isLoading, isError, refetch } = useQuery({
    queryKey: ["driver-standings", "current"],
    queryFn: fetchStandings,
    staleTime: 5 * 60 * 1000,
  });

  const { data: photos } = useQuery({
    queryKey: ["driver-photos"],
    queryFn: fetchDriverPhotos,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { data: news, isLoading: newsLoading } = useQuery({
    queryKey: ["driver-news", selected?.Driver.familyName],
    queryFn: () => fetchDriverNews(selected!.Driver.familyName),
    enabled: !!selected,
    staleTime: 15 * 60 * 1000,
  });

  const { data: seasonStats, isLoading: seasonLoading } = useQuery({
    queryKey: ["driver-season", "current", selected?.Driver.driverId],
    queryFn: () => fetchDriverSeason(selected!.Driver.driverId),
    enabled: !!selected,
    staleTime: 60 * 60 * 1000,
  });

  const { data: careerData, isLoading: careerLoading } = useQuery({
    queryKey: ["driver-career", selected?.Driver.driverId],
    queryFn: () =>
      fetch(`/api/driver-career?driverId=${encodeURIComponent(selected!.Driver.driverId)}`)
        .then((r) => r.json()) as Promise<{ driverId: string; career: import("@/lib/stats/driverCareer").DriverCareerStats }>,
    enabled: !!selected,
    staleTime: 24 * 60 * 60 * 1000,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">2026 Drivers</h1>

      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        <div
          className={`grid gap-3 grid-cols-1 ${
            selected ? "lg:grid-cols-2 lg:flex-1 lg:min-w-0" : "w-full lg:grid-cols-3"
          }`}
        >
          {isLoading &&
            Array.from({ length: 20 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}

          {isError && (
            <div className="col-span-full flex items-center gap-3 py-6">
              <p className="text-muted-foreground text-sm">Failed to load drivers.</p>
              <button onClick={() => refetch()} className="text-xs text-primary hover:underline">
                Retry
              </button>
            </div>
          )}

          {drivers?.map((d) => {
            const team = d.Constructors[0]?.name ?? "Unknown";
            const color = getTeamColor(team);
            const pos = parseInt(d.position, 10);
            const isActive = selected?.Driver.driverId === d.Driver.driverId;

            return (
              <Fragment key={d.Driver.driverId}>
                <button
                  onClick={() => setSelected(isActive ? null : d)}
                  className={`rounded-lg border px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center gap-2.5 sm:gap-3 transition-all text-left w-full cursor-pointer ${
                    isActive
                      ? "bg-surface-3 border-ring ring-1 ring-ring"
                      : "bg-surface-2 border-border hover:bg-accent/40"
                  }`}
                  style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                >
                  <div className="text-2xl sm:text-3xl font-black text-muted-foreground/40 w-7 sm:w-8 text-center tabular-nums shrink-0">
                    {pos}
                  </div>
                  <DriverHeadshot driver={d} photos={photos ?? []} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs font-bold" style={{ color }}>
                        {d.Driver.code}
                      </span>
                      {d.wins !== "0" && (
                        <Badge className="bg-medal-gold/15 text-medal-gold border-medal-gold/30 text-[10px] px-1">
                          {d.wins}W
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium leading-tight truncate">
                      {d.Driver.givenName} {d.Driver.familyName}
                    </p>
                    <p className="text-xs leading-tight text-muted-foreground truncate">{team}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold font-mono text-sm sm:text-base leading-tight">{d.points}</p>
                    <p className="text-[10px] text-muted-foreground/50">pts</p>
                  </div>
                </button>

                {isActive && (
                  <div className="lg:hidden">
                    <DriverDetailPanel
                      driver={d}
                      news={news}
                      newsLoading={newsLoading}
                      seasonStats={seasonStats}
                      seasonLoading={seasonLoading}
                      careerData={careerData?.career}
                      careerLoading={careerLoading}
                      onClose={() => setSelected(null)}
                    />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>

        {selected && (
          <div className="hidden lg:block lg:w-[380px] lg:shrink-0 lg:sticky lg:top-4">
            <DriverDetailPanel
              driver={selected}
              news={news}
              newsLoading={newsLoading}
              seasonStats={seasonStats}
              seasonLoading={seasonLoading}
              careerData={careerData?.career}
              careerLoading={careerLoading}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
