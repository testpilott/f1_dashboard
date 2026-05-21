"use client";

import { useState } from "react";
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
import { TrendingUp, TrendingDown, Minus, X } from "lucide-react";
import {
  Dialog,
  DialogPortal,
  DialogBackdrop,
  DialogPopup,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { DriverSeasonStats } from "@/components/stats/DriverSeasonStats";
import type { DriverSeasonSummary } from "@/lib/stats/driverSeason";

// ─── Types ────────────────────────────────────────────────────────────────────

type DriverSeasonData = {
  season: string;
  driverId: string;
  summary: DriverSeasonSummary;
};

type StandingsData = {
  drivers: DriverStanding[];
  constructors: ConstructorStanding[];
};

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchDriverSeason(season: string, driverId: string): Promise<DriverSeasonData> {
  const res = await fetch(`/api/driver-season?season=${season}&driverId=${encodeURIComponent(driverId)}`);
  if (!res.ok) throw new Error("Failed to fetch driver season data");
  return res.json() as Promise<DriverSeasonData>;
}

async function fetchStandings(season = "current") {
  const res = await fetch(`/api/standings?season=${season}`);
  if (!res.ok) throw new Error("Failed to fetch standings");
  return res.json() as Promise<StandingsData>;
}

async function fetchForm(season = "current") {
  const res = await fetch(`/api/form?season=${season}`);
  if (!res.ok) throw new Error("Failed to fetch form");
  return res.json() as Promise<{ form: Record<string, DriverForm> }>;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

// ─── Driver season dialog ─────────────────────────────────────────────────────

function DriverSeasonDialog({
  driver,
  season,
  open,
  onOpenChange,
}: {
  driver: DriverStanding | null;
  season: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const team = driver?.Constructors[0]?.name ?? "Unknown";
  const color = getTeamColor(team);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["driver-season", season, driver?.Driver.driverId],
    queryFn: () => fetchDriverSeason(season, driver!.Driver.driverId),
    enabled: open && !!driver,
    staleTime: 60 * 60 * 1000,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup>
          {/* Team color stripe */}
          <div className="h-1 w-full rounded-t-xl" style={{ backgroundColor: color }} />

          {/* Header */}
          <div className="flex items-center justify-between p-5 pb-3">
            <div className="flex items-center gap-3">
              <TeamLogo team={team} size={32} />
              <div>
                <span className="font-mono text-xs font-bold" style={{ color }}>
                  {driver?.Driver.code}
                </span>
                <DialogTitle className="text-lg font-bold leading-tight">
                  {driver?.Driver.givenName} {driver?.Driver.familyName}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">{team}</p>
              </div>
            </div>
            <DialogClose aria-label="Close">
              <X size={16} />
            </DialogClose>
          </div>

          {/* Season label */}
          <p className="px-5 pb-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            {season === "current" ? "Current Season" : `${season} Season`}
          </p>

          {/* Content */}
          <div className="px-5 pb-5">
            {isLoading && (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            )}
            {isError && (
              <p className="text-sm text-muted-foreground">Failed to load season data.</p>
            )}
            {data && <DriverSeasonStats summary={data.summary} />}
            {data && data.summary.rows.length === 0 && (
              <p className="text-sm text-muted-foreground">No race data available yet.</p>
            )}
          </div>

          <div className="h-4" />
        </DialogPopup>
      </DialogPortal>
    </Dialog>
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
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["standings", season],
    queryFn: () => fetchStandings(season),
    initialData,
  });

  const { data: formData } = useQuery({
    queryKey: ["driver-form", season],
    queryFn: () => fetchForm(season),
    staleTime: 5 * 60 * 1000,
  });
  const form = formData?.form ?? {};

  function openDriver(d: DriverStanding) {
    setSelectedDriver(d);
    setDialogOpen(true);
  }

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
                    const isSelected = selectedDriver?.Driver.driverId === d.Driver.driverId && dialogOpen;
                    return (
                      <TableRow
                        key={d.Driver.driverId}
                        role="button"
                        tabIndex={0}
                        className={`border-border cursor-pointer transition-colors ${isSelected ? "bg-accent/60" : "hover:bg-accent/40"}`}
                        onClick={() => openDriver(d)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openDriver(d);
                          }
                        }}
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

      <DriverSeasonDialog
        driver={selectedDriver}
        season={season}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedDriver(null);
        }}
      />
    </>
  );
}
