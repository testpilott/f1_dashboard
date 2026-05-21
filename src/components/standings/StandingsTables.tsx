"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DriverStanding, ConstructorStanding } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeamLogo from "@/components/ui/TeamLogo";
import { getTeamColor } from "@/lib/constants/teams";
import type { DriverForm } from "@/lib/stats/form";
import { TrendingUp, TrendingDown, Minus, X, Zap } from "lucide-react";

// ─── Driver season types ──────────────────────────────────────────────────────

type DriverSeasonRace = {
  round: number;
  raceName: string;
  grid: number;
  position: number | null;
  points: number;
  status: string;
  fastestLap: boolean;
};

type DriverSeasonData = {
  season: string;
  driverId: string;
  races: DriverSeasonRace[];
  totals: {
    starts: number;
    wins: number;
    podiums: number;
    dnfs: number;
    fastestLaps: number;
    points: number;
  };
};

async function fetchDriverSeason(season: string, driverId: string): Promise<DriverSeasonData> {
  const res = await fetch(`/api/driver-season?season=${season}&driverId=${encodeURIComponent(driverId)}`);
  if (!res.ok) throw new Error("Failed to fetch driver season data");
  return res.json() as Promise<DriverSeasonData>;
}

type StandingsData = {
  drivers: DriverStanding[];
  constructors: ConstructorStanding[];
};

async function fetchStandings(season = "current") {
  const res = await fetch(`/api/standings?season=${season}`);
  if (!res.ok) throw new Error("Failed to fetch standings");
  return res.json() as Promise<{ drivers: DriverStanding[]; constructors: ConstructorStanding[] }>;
}

async function fetchForm(season = "current") {
  const res = await fetch(`/api/form?season=${season}`);
  if (!res.ok) throw new Error("Failed to fetch form");
  return res.json() as Promise<{ form: Record<string, DriverForm> }>;
}

const MEDAL: Record<number, string> = {
  1: "bg-medal-gold text-medal-foreground",
  2: "bg-medal-silver text-medal-foreground",
  3: "bg-medal-bronze text-medal-foreground",
};

function PositionBadge({ pos }: { pos: number }) {
  const medal = MEDAL[pos];
  if (medal)
    return (
      <Badge className={`${medal} font-bold w-7 h-7 flex items-center justify-center rounded-full p-0 tabular-nums`}>
        {pos}
      </Badge>
    );
  return <span className="text-muted-foreground font-mono text-sm w-7 inline-flex justify-center tabular-nums">{pos}</span>;
}

function FormChip({ form }: { form?: DriverForm }) {
  if (!form || form.races === 0)
    return <span className="text-muted-foreground/60 text-xs" aria-hidden="true">—</span>;

  const { trend, avgPoints, races } = form;
  const Icon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const tone =
    trend === "up"
      ? "text-chart-5"
      : trend === "down"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <span
      className={`inline-flex items-center gap-1 ${tone}`}
      title={`Form over last ${races} race${races === 1 ? "" : "s"}: ${avgPoints.toFixed(1)} avg pts, trend ${trend}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span className="font-mono text-xs tabular-nums">{avgPoints.toFixed(1)}</span>
    </span>
  );
}

function StandingsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

// ─── Driver season modal ──────────────────────────────────────────────────────

function DriverSeasonModal({
  driver,
  season,
  onClose,
}: {
  driver: DriverStanding;
  season: string;
  onClose: () => void;
}) {
  const team = driver.Constructors[0]?.name ?? "Unknown";
  const color = getTeamColor(team);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["driver-season", season, driver.Driver.driverId],
    queryFn: () => fetchDriverSeason(season, driver.Driver.driverId),
    staleTime: 60 * 60 * 1000,
  });

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
      aria-hidden="true"
    >
      {/* Panel */}
      <div
        className="bg-surface-1 border border-border rounded-t-xl sm:rounded-xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="driver-modal-title"
      >
        {/* Team color stripe */}
        <div className="h-1 w-full rounded-t-xl" style={{ backgroundColor: color }} />

        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3">
          <div className="flex items-center gap-3">
            <TeamLogo team={team} size={32} />
            <div>
              <span className="font-mono text-xs font-bold" style={{ color }}>
                {driver.Driver.code}
              </span>
              <h2
                id="driver-modal-title"
                className="text-lg font-bold leading-tight"
              >
                {driver.Driver.givenName} {driver.Driver.familyName}
              </h2>
              <p className="text-xs text-muted-foreground">{team}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Season label */}
        <p className="px-5 pb-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
          {season === "current" ? "Current Season" : `${season} Season`}
        </p>

        {isLoading && (
          <div className="px-5 pb-5 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        )}

        {isError && (
          <p className="px-5 pb-5 text-sm text-muted-foreground">Failed to load season data.</p>
        )}

        {data && (
          <>
            {/* Totals chips */}
            <div className="grid grid-cols-3 gap-2 px-5 pb-4">
              <ModalStatChip label="Starts" value={String(data.totals.starts)} />
              <ModalStatChip label="Wins" value={String(data.totals.wins)} highlight={data.totals.wins > 0} />
              <ModalStatChip label="Podiums" value={String(data.totals.podiums)} highlight={data.totals.podiums > 0} />
              <ModalStatChip label="DNFs" value={String(data.totals.dnfs)} />
              <ModalStatChip label="Fastest" value={String(data.totals.fastestLaps)} icon={<Zap size={11} className="text-[var(--f1-red)]" />} />
              <ModalStatChip label="Points" value={String(data.totals.points)} bold />
            </div>

            {/* Race-by-race table */}
            {data.races.length > 0 && (
              <div className="border-t border-border/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60">
                        <th className="text-left text-[11px] text-muted-foreground font-medium px-5 py-2">Race</th>
                        <th className="text-center text-[11px] text-muted-foreground font-medium px-3 py-2">Grid</th>
                        <th className="text-center text-[11px] text-muted-foreground font-medium px-3 py-2">Fin</th>
                        <th className="text-right text-[11px] text-muted-foreground font-medium px-5 py-2">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.races.map((r) => (
                        <tr key={r.round} className="border-b border-border/30 last:border-0">
                          <td className="px-5 py-2 text-sm">
                            <span className="text-muted-foreground/60 font-mono text-xs mr-2">{r.round}</span>
                            <span className="text-foreground/90 truncate">{r.raceName.replace(" Grand Prix", " GP")}</span>
                            {r.fastestLap && (
                              <Zap size={10} className="inline ml-1 text-[var(--f1-red)]" aria-label="Fastest lap" />
                            )}
                          </td>
                          <td className="px-3 py-2 text-center font-mono text-xs text-muted-foreground">
                            {r.grid === 0 ? "PL" : r.grid}
                          </td>
                          <td className="px-3 py-2 text-center font-mono text-xs">
                            {r.position === null ? (
                              <span className="text-destructive font-medium">DNF</span>
                            ) : r.position <= 3 ? (
                              <span className="font-bold" style={{ color: r.position === 1 ? "#C9A84C" : r.position === 2 ? "#A8A9AD" : "#CD7F32" }}>
                                P{r.position}
                              </span>
                            ) : (
                              <span className="text-foreground/70">P{r.position}</span>
                            )}
                          </td>
                          <td className="px-5 py-2 text-right font-mono text-xs font-bold">
                            {r.points > 0 ? r.points : <span className="text-muted-foreground/40">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {data.races.length === 0 && (
              <p className="px-5 pb-5 text-sm text-muted-foreground">No race data available yet.</p>
            )}
          </>
        )}
        {/* Bottom safe area for mobile */}
        <div className="h-4" />
      </div>
    </div>
  );
}

function ModalStatChip({
  label,
  value,
  highlight = false,
  bold = false,
  icon,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  bold?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-surface-2 border border-border/40 rounded-lg p-2 text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`font-mono text-base ${bold ? "font-black" : "font-bold"} ${highlight ? "text-chart-5" : ""} flex items-center justify-center gap-1`}>
        {icon}{value}
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StandingsTables({
  season = "current",
  initialData,
}: {
  season?: string;
  initialData?: StandingsData;
}) {
  const [selectedDriver, setSelectedDriver] = useState<DriverStanding | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["standings", season],
    queryFn: () => fetchStandings(season),
    initialData,
  });

  // Progressive enhancement: form chips hydrate independently of standings and
  // never block or break the table if the form endpoint is slow or fails.
  const { data: formData } = useQuery({
    queryKey: ["driver-form", season],
    queryFn: () => fetchForm(season),
    staleTime: 5 * 60 * 1000,
  });
  const form = formData?.form ?? {};

  return (
    <>
      <Tabs defaultValue="drivers" className="w-full">
      <TabsList className="mb-4 bg-surface-2">
        <TabsTrigger value="drivers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          Drivers
        </TabsTrigger>
        <TabsTrigger value="constructors" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          Constructors
        </TabsTrigger>
      </TabsList>

      <TabsContent value="drivers">
        {isLoading && <StandingsSkeleton />}
        {isError && <p className="text-muted-foreground text-sm">Failed to load standings.</p>}
        {!isLoading && !isError && !data?.drivers.length && (
          <p className="text-muted-foreground text-sm">No standings available yet.</p>
        )}
        {data && (
          <div className="overflow-x-auto -mx-4 px-4">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground w-12">Pos</TableHead>
                <TableHead className="text-muted-foreground">Driver</TableHead>
                <TableHead className="text-muted-foreground">Team</TableHead>
                <TableHead className="text-muted-foreground">Form</TableHead>
                <TableHead className="text-muted-foreground text-right">Wins</TableHead>
                <TableHead className="text-muted-foreground text-right">Pts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.drivers.map((d) => {
                const pos = parseInt(d.position, 10);
                const team = d.Constructors[0]?.name ?? "Unknown";
                const accentColor = getTeamColor(team);
                const isSelected = selectedDriver?.Driver.driverId === d.Driver.driverId;
                return (
                  <TableRow
                    key={d.Driver.driverId}
                    className={`border-border cursor-pointer transition-colors ${isSelected ? "bg-accent/60" : "hover:bg-accent/40"}`}
                    onClick={() => setSelectedDriver(isSelected ? null : d)}
                    aria-label={`View ${d.Driver.givenName} ${d.Driver.familyName} season stats`}
                  >
                    <TableCell className="py-2.5">
                      <PositionBadge pos={pos} />
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="shrink-0 w-1 h-5 rounded-sm"
                          style={{ backgroundColor: accentColor }}
                          aria-hidden="true"
                        />
                        <TeamLogo team={team} />
                        <span className="font-mono text-xs text-muted-foreground w-8 shrink-0 tabular-nums">{d.Driver.code}</span>
                        <span className="text-sm font-medium">
                          {d.Driver.givenName} {d.Driver.familyName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-muted-foreground text-sm">{team}</TableCell>
                    <TableCell className="py-2.5">
                      <FormChip form={form[d.Driver.driverId]} />
                    </TableCell>
                    <TableCell className="py-2.5 text-right text-muted-foreground text-sm font-mono tabular-nums">{d.wins}</TableCell>
                    <TableCell className="py-2.5 text-right font-bold font-mono tabular-nums">{d.points}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="constructors">
        {isLoading && <StandingsSkeleton />}
        {isError && <p className="text-muted-foreground text-sm">Failed to load standings.</p>}
        {!isLoading && !isError && !data?.constructors.length && (
          <p className="text-muted-foreground text-sm">No constructor standings available yet.</p>
        )}
        {data && (
          <div className="overflow-x-auto -mx-4 px-4">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground w-12">Pos</TableHead>
                <TableHead className="text-muted-foreground">Constructor</TableHead>
                <TableHead className="text-muted-foreground text-right">Wins</TableHead>
                <TableHead className="text-muted-foreground text-right">Pts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.constructors.map((c) => {
                const pos = parseInt(c.position, 10);
                const accentColor = getTeamColor(c.Constructor.name);
                return (
                  <TableRow key={c.Constructor.constructorId} className="border-border hover:bg-accent/40">
                    <TableCell className="py-2.5">
                      <PositionBadge pos={pos} />
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="shrink-0 w-1 h-5 rounded-sm"
                          style={{ backgroundColor: accentColor }}
                          aria-hidden="true"
                        />
                        <TeamLogo team={c.Constructor.name} />
                        <span className="text-sm font-medium">{c.Constructor.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-right text-muted-foreground text-sm font-mono tabular-nums">{c.wins}</TableCell>
                    <TableCell className="py-2.5 text-right font-bold font-mono tabular-nums">{c.points}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        )}
      </TabsContent>
    </Tabs>

    {selectedDriver && (
      <DriverSeasonModal
        driver={selectedDriver}
        season={season}
        onClose={() => setSelectedDriver(null)}
      />
    )}
    </>
  );
}
