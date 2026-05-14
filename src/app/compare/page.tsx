"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { DriverStanding } from "@/lib/types";
import { getTeamColor } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

async function fetchStandings() {
  const res = await fetch("/api/standings?season=current");
  if (!res.ok) throw new Error("Failed");
  return res.json().then((d) => d.drivers as DriverStanding[]);
}

function StatBar({ label, a, b, colorA, colorB }: { label: string; a: number; b: number; colorA: string; colorB: string }) {
  const total = a + b || 1;
  const pctA = (a / total) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-mono">
        <span style={{ color: colorA }}>{a}</span>
        <span className="text-zinc-500 text-[10px] uppercase tracking-wider">{label}</span>
        <span style={{ color: colorB }}>{b}</span>
      </div>
      <div className="flex h-2 rounded overflow-hidden bg-zinc-800">
        <div style={{ width: `${pctA}%`, backgroundColor: colorA }} className="transition-all" />
        <div style={{ width: `${100 - pctA}%`, backgroundColor: colorB }} className="transition-all" />
      </div>
    </div>
  );
}

export default function ComparePage() {
  const [driverAId, setDriverAId] = useState<string>("");
  const [driverBId, setDriverBId] = useState<string>("");

  const { data: standings, isLoading } = useQuery({
    queryKey: ["standings", "current"],
    queryFn: fetchStandings,
    staleTime: 5 * 60 * 1000,
  });

  const driverA = standings?.find((d) => d.Driver.driverId === driverAId);
  const driverB = standings?.find((d) => d.Driver.driverId === driverBId);

  const colorA = getTeamColor(driverA?.Constructors[0]?.name ?? "");
  const colorB = getTeamColor(driverB?.Constructors[0]?.name ?? "");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Driver Head-to-Head</h1>

      {isLoading && <Skeleton className="h-10 w-full bg-zinc-800" />}

      {standings && (
        <div className="flex items-center gap-4 mb-8 flex-wrap">
          <Select value={driverAId} onValueChange={(v) => v && setDriverAId(v)}>
            <SelectTrigger className="w-48 bg-zinc-900 border-zinc-700">
              <SelectValue placeholder="Select Driver A" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              {standings.map((d) => (
                <SelectItem
                  key={d.Driver.driverId}
                  value={d.Driver.driverId}
                  disabled={d.Driver.driverId === driverBId}
                >
                  {d.Driver.givenName} {d.Driver.familyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-zinc-500 font-bold">vs</span>

          <Select value={driverBId} onValueChange={(v) => v && setDriverBId(v)}>
            <SelectTrigger className="w-48 bg-zinc-900 border-zinc-700">
              <SelectValue placeholder="Select Driver B" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              {standings.map((d) => (
                <SelectItem
                  key={d.Driver.driverId}
                  value={d.Driver.driverId}
                  disabled={d.Driver.driverId === driverAId}
                >
                  {d.Driver.givenName} {d.Driver.familyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {driverA && driverB && (
        <div className="space-y-6">
          {/* Driver header cards */}
          <div className="grid grid-cols-2 gap-4">
            {([driverA, driverB] as const).map((d, idx) => {
              const color = idx === 0 ? colorA : colorB;
              const team = d.Constructors[0]?.name ?? "Unknown";
              return (
                <div
                  key={d.Driver.driverId}
                  className="rounded-lg bg-zinc-900 border border-zinc-800 p-4"
                  style={{ borderTopColor: color, borderTopWidth: 3 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-2xl font-black tracking-tight"
                      style={{ color }}
                    >
                      {d.Driver.code}
                    </span>
                    <Badge className="text-xs px-1.5" style={{ backgroundColor: color + "33", color }}>
                      P{d.position}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{d.Driver.givenName} {d.Driver.familyName}</p>
                  <p className="text-xs text-zinc-500">{team}</p>
                </div>
              );
            })}
          </div>

          {/* Stat comparison bars */}
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-5 space-y-4">
            <StatBar
              label="Points"
              a={parseFloat(driverA.points)}
              b={parseFloat(driverB.points)}
              colorA={colorA}
              colorB={colorB}
            />
            <StatBar
              label="Wins"
              a={parseInt(driverA.wins, 10)}
              b={parseInt(driverB.wins, 10)}
              colorA={colorA}
              colorB={colorB}
            />
            <StatBar
              label="Championship Pos"
              a={21 - parseInt(driverA.position, 10)}
              b={21 - parseInt(driverB.position, 10)}
              colorA={colorA}
              colorB={colorB}
            />
          </div>

          <p className="text-xs text-zinc-600">
            Points gap: {Math.abs(parseFloat(driverA.points) - parseFloat(driverB.points)).toFixed(0)} pts in favour of{" "}
            {parseFloat(driverA.points) >= parseFloat(driverB.points)
              ? `${driverA.Driver.familyName}`
              : `${driverB.Driver.familyName}`}
          </p>
        </div>
      )}

      {!driverA && !driverB && standings && (
        <p className="text-zinc-500 text-sm">Select two drivers above to compare their current season stats.</p>
      )}
    </div>
  );
}
