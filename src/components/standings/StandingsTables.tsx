"use client";

import { useQuery } from "@tanstack/react-query";
import type { DriverStanding, ConstructorStanding } from "@/lib/types";
import { getTeamColor } from "@/lib/constants";
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

async function fetchStandings(season = "current") {
  const res = await fetch(`/api/standings?season=${season}`);
  if (!res.ok) throw new Error("Failed to fetch standings");
  return res.json() as Promise<{ drivers: DriverStanding[]; constructors: ConstructorStanding[] }>;
}

function PositionBadge({ pos }: { pos: number }) {
  if (pos === 1) return <Badge className="bg-yellow-500 text-black font-bold w-7 h-7 flex items-center justify-center rounded-full p-0">1</Badge>;
  if (pos === 2) return <Badge className="bg-zinc-400 text-black font-bold w-7 h-7 flex items-center justify-center rounded-full p-0">2</Badge>;
  if (pos === 3) return <Badge className="bg-amber-700 text-white font-bold w-7 h-7 flex items-center justify-center rounded-full p-0">3</Badge>;
  return <span className="text-zinc-400 font-mono text-sm w-7 inline-flex justify-center">{pos}</span>;
}

function TeamDot({ team }: { team: string }) {
  const color = getTeamColor(team);
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full mr-2 shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

function StandingsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full bg-zinc-800" />
      ))}
    </div>
  );
}

export default function StandingsTables({ season = "current" }: { season?: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["standings", season],
    queryFn: () => fetchStandings(season),
  });

  return (
    <Tabs defaultValue="drivers" className="w-full">
      <TabsList className="mb-4 bg-zinc-900">
        <TabsTrigger value="drivers" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
          Drivers
        </TabsTrigger>
        <TabsTrigger value="constructors" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
          Constructors
        </TabsTrigger>
      </TabsList>

      <TabsContent value="drivers">
        {isLoading && <StandingsSkeleton />}
        {isError && <p className="text-zinc-500 text-sm">Failed to load standings.</p>}
        {data && (
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-500 w-12">Pos</TableHead>
                <TableHead className="text-zinc-500">Driver</TableHead>
                <TableHead className="text-zinc-500">Team</TableHead>
                <TableHead className="text-zinc-500 text-right">Wins</TableHead>
                <TableHead className="text-zinc-500 text-right">Pts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.drivers.map((d) => {
                const pos = parseInt(d.position, 10);
                const team = d.Constructors[0]?.name ?? "Unknown";
                return (
                  <TableRow key={d.Driver.driverId} className="border-zinc-800 hover:bg-zinc-900/60">
                    <TableCell className="py-2.5">
                      <PositionBadge pos={pos} />
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2">
                        <TeamDot team={team} />
                        <span className="font-mono text-xs text-zinc-500 w-8 shrink-0">{d.Driver.code}</span>
                        <span className="text-sm font-medium">
                          {d.Driver.givenName} {d.Driver.familyName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-zinc-400 text-sm">{team}</TableCell>
                    <TableCell className="py-2.5 text-right text-zinc-400 text-sm">{d.wins}</TableCell>
                    <TableCell className="py-2.5 text-right font-bold font-mono">{d.points}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </TabsContent>

      <TabsContent value="constructors">
        {isLoading && <StandingsSkeleton />}
        {isError && <p className="text-zinc-500 text-sm">Failed to load standings.</p>}
        {data && (
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-500 w-12">Pos</TableHead>
                <TableHead className="text-zinc-500">Constructor</TableHead>
                <TableHead className="text-zinc-500 text-right">Wins</TableHead>
                <TableHead className="text-zinc-500 text-right">Pts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.constructors.map((c) => {
                const pos = parseInt(c.position, 10);
                return (
                  <TableRow key={c.Constructor.constructorId} className="border-zinc-800 hover:bg-zinc-900/60">
                    <TableCell className="py-2.5">
                      <PositionBadge pos={pos} />
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2">
                        <TeamDot team={c.Constructor.name} />
                        <span className="text-sm font-medium">{c.Constructor.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-right text-zinc-400 text-sm">{c.wins}</TableCell>
                    <TableCell className="py-2.5 text-right font-bold font-mono">{c.points}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </TabsContent>
    </Tabs>
  );
}
