"use client";

import { useQuery } from "@tanstack/react-query";
import type { DriverStanding } from "@/lib/types";
import { getTeamColor } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import TeamLogo from "@/components/ui/TeamLogo";

async function fetchStandings() {
  const res = await fetch("/api/standings?season=current");
  if (!res.ok) throw new Error("Failed");
  return res.json().then((d) => (Array.isArray(d.drivers) ? d.drivers : []) as DriverStanding[]);
}

export default function DriversPage() {
  const { data: drivers, isLoading } = useQuery({
    queryKey: ["standings", "current"],
    queryFn: fetchStandings,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">2026 Drivers</h1>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 20 }).map((_, i) => (
            <Skeleton key={i} className="h-24 bg-zinc-800 rounded-lg" />
          ))}
        </div>
      )}

      {drivers && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {drivers.map((d) => {
            const team = d.Constructors[0]?.name ?? "Unknown";
            const color = getTeamColor(team);
            const pos = parseInt(d.position, 10);

            return (
              <div
                key={d.Driver.driverId}
                className="rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-4 flex items-center gap-4 transition-colors"
                style={{ borderLeftColor: color, borderLeftWidth: 3 }}
              >
                <div className="text-3xl font-black text-zinc-700 w-8 text-center tabular-nums shrink-0">
                  {pos}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <TeamLogo team={team} />
                    <span className="font-mono text-xs font-bold" style={{ color }}>{d.Driver.code}</span>
                    {d.wins !== "0" && (
                      <Badge className="bg-yellow-900/40 text-yellow-400 border-yellow-900 text-[10px] px-1">
                        {d.wins}W
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium truncate">
                    {d.Driver.givenName} {d.Driver.familyName}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">{team}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold font-mono text-lg">{d.points}</p>
                  <p className="text-[10px] text-zinc-600">pts</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
