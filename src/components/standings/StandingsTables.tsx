"use client";

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
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

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

export default function StandingsTables({
  season = "current",
  initialData,
}: {
  season?: string;
  initialData?: StandingsData;
}) {
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
                return (
                  <TableRow key={d.Driver.driverId} className="border-border hover:bg-accent/40">
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
  );
}
