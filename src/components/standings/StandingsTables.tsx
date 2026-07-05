"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DriverStanding, ConstructorStanding } from "@/lib/types";
import { fetchJson } from "@/lib/api/clientFetch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeamLogo from "@/components/ui/TeamLogo";
import { getTeamColor } from "@/lib/constants/teams";
import type { DriverForm } from "@/lib/stats/form";
import FormChip from "@/components/standings/FormChip";
import MedalPositionBadge from "@/components/standings/MedalPositionBadge";
import StandingsSkeleton from "@/components/standings/StandingsSkeleton";
import DriverSeasonDialog from "@/components/standings/DriverSeasonDialog";
import SprintWinsChip from "@/components/ui/SprintWinsChip";
import type { SprintWinTallies } from "@/lib/stats/sprintWins";

// ─── Types ────────────────────────────────────────────────────────────────────

type StandingsData = {
  drivers: DriverStanding[];
  constructors: ConstructorStanding[];
  /** Optional enrichment; absent/null when sprint results are unavailable. */
  sprintWins?: SprintWinTallies | null;
};

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchStandings(season = "current") {
  return fetchJson<StandingsData>(`/api/standings?season=${season}`);
}

async function fetchForm(season = "current") {
  return fetchJson<{ form: Record<string, DriverForm> }>(`/api/form?season=${season}`);
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
                          <MedalPositionBadge pos={pos} />
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
                        <TableCell className="py-2.5 text-right text-muted-foreground text-sm font-mono tabular-nums">
                          <span className="inline-flex items-center justify-end gap-1.5">
                            <SprintWinsChip count={data.sprintWins?.drivers[d.Driver.driverId]} />
                            <span>{d.wins}</span>
                          </span>
                        </TableCell>
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
                          <MedalPositionBadge pos={pos} />
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
                        <TableCell className="py-2.5 text-right text-muted-foreground text-sm font-mono tabular-nums">
                          <span className="inline-flex items-center justify-end gap-1.5">
                            <SprintWinsChip count={data.sprintWins?.constructors[c.Constructor.constructorId]} />
                            <span>{c.wins}</span>
                          </span>
                        </TableCell>
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
