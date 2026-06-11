"use client";

import { Fragment, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { DriverStanding } from "@/lib/types";
import { getTeamColor } from "@/lib/constants";
import { normalizeSeason, seasonLabel } from "@/lib/season";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import SeasonPicker from "@/components/ui/SeasonPicker";
import DriverHeadshot from "@/components/drivers/DriverHeadshot";
import DriverDetailPanel from "@/components/drivers/DriverDetailPanel";
import FavoriteStar from "@/components/drivers/FavoriteStar";
import { useFavorites } from "@/hooks/useFavorites";
import { useDriverDetails } from "@/hooks/useDriverDetails";

function DriversPageInner() {
  const searchParams = useSearchParams();
  const season = normalizeSeason(searchParams.get("season"));
  const [selected, setSelected] = useState<DriverStanding | null>(null);
  const { hydrated, toggle, isFavorite: isFav } = useFavorites();

  const {
    standings: displayDrivers,
    photos,
    isLoading,
    isError,
    refetch,
    news,
    newsLoading,
    seasonStats,
    seasonLoading,
    career,
    careerLoading,
    wikidata,
    wikidataLoading,
  } = useDriverDetails(selected?.Driver.driverId ?? null, season);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{seasonLabel(season).replace(" (current)", "")} Drivers</h1>
        <SeasonPicker current={season} />
      </div>

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

          {displayDrivers.map((d, idx) => {
            const team = d.Constructors[0]?.name ?? "Unknown";
            const color = getTeamColor(team);
            const pos = parseInt(d.position, 10);
            const isActive = selected?.Driver.driverId === d.Driver.driverId;
            const favorite = hydrated && isFav(d.Driver.driverId);

            return (
              <Fragment key={d.Driver.driverId}>
                <div className="relative">
                  <button
                    onClick={() => setSelected(isActive ? null : d)}
                    className={`rounded-lg border px-4 py-3.5 sm:px-5 sm:py-4 flex items-center gap-3 sm:gap-4 transition-all text-left w-full cursor-pointer min-h-[112px] ${
                      isActive
                        ? "bg-surface-3 border-ring ring-1 ring-ring"
                        : favorite
                          ? "bg-surface-2 border-medal-gold/70 ring-1 ring-medal-gold/40 hover:bg-accent/40"
                          : "bg-surface-2 border-border hover:bg-accent/40"
                    }`}
                    style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                  >
                    <div className="text-2xl sm:text-3xl font-black text-muted-foreground/40 w-7 sm:w-8 text-center tabular-nums shrink-0">
                      {pos}
                    </div>
                    <DriverHeadshot driver={d} photos={photos ?? []} size={84} priority={idx < 4} />
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
                      <p className="text-sm font-medium leading-tight truncate pr-6">
                        {d.Driver.givenName} {d.Driver.familyName}
                      </p>
                      <p className="text-xs leading-tight text-muted-foreground truncate">{team}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold font-mono text-sm sm:text-base leading-tight">{d.points}</p>
                      <p className="text-[10px] text-muted-foreground/50">pts</p>
                    </div>
                  </button>
                  <div className="absolute right-2 bottom-2">
                    <FavoriteStar
                      driverId={d.Driver.driverId}
                      isFavorite={favorite}
                      onToggle={() => toggle(d.Driver.driverId)}
                    />
                  </div>
                </div>

                {isActive && (
                  <div className="lg:hidden">
                    <DriverDetailPanel
                      driver={d}
                      news={news}
                      newsLoading={newsLoading}
                      seasonStats={seasonStats}
                      seasonLoading={seasonLoading}
                      careerData={career}
                      careerLoading={careerLoading}
                      wikidataProfile={wikidata}
                      wikidataLoading={wikidataLoading}
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
              careerData={career}
              careerLoading={careerLoading}
              wikidataProfile={wikidata}
              wikidataLoading={wikidataLoading}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function DriversPage() {
  return (
    <Suspense fallback={<div className="space-y-3">{Array.from({ length: 20 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>}>
      <DriversPageInner />
    </Suspense>
  );
}

