"use client";

import { useMemo, useState } from "react";
import { getTeamColor } from "@/lib/constants";
import TeamLogo from "@/components/ui/TeamLogo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { circuitHeadToHead } from "@/lib/stats/circuitHeadToHead";
import StatBar from "@/components/compare/StatBar";
import CircuitHistory from "@/components/compare/CircuitHistory";
import { useDriverComparison } from "@/hooks/useDriverComparison";

export default function DriversCompareTab() {
  const [driverAId, setDriverAId] = useState("");
  const [driverBId, setDriverBId] = useState("");
  const [circuitId, setCircuitId] = useState("");

  const {
    standings,
    standLoading,
    schedule,
    schedLoading,
    driverA,
    driverB,
    bothSelected,
    compareData,
    compareLoading,
    compareError,
    seasonData,
    selectedCircuit,
  } = useDriverComparison(driverAId, driverBId, circuitId);

  const colorA = getTeamColor(driverA?.Constructors[0]?.name ?? "");
  const colorB = getTeamColor(driverB?.Constructors[0]?.name ?? "");
  const circuitStats = useMemo(
    () => circuitHeadToHead(compareData?.history ?? []),
    [compareData?.history],
  );

  return (
    <>
      <div className="space-y-4 mb-8">
        {standLoading ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-36">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Driver A</p>
              <Select value={driverAId} onValueChange={(v) => v && setDriverAId(v)}>
                <SelectTrigger className="w-full bg-surface-2 border-border" style={colorA ? { borderTopColor: colorA, borderTopWidth: 2 } : undefined}>
                  <SelectValue placeholder="Select Driver A…" />
                </SelectTrigger>
                <SelectContent className="bg-surface-2 border-border">
                  {standings?.map((d) => (
                    <SelectItem key={d.Driver.driverId} value={d.Driver.driverId} disabled={d.Driver.driverId === driverBId}>
                      P{d.position} · {d.Driver.givenName} {d.Driver.familyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-muted-foreground/50 font-bold mb-2 shrink-0">vs</span>
            <div className="flex-1 min-w-36">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Driver B</p>
              <Select value={driverBId} onValueChange={(v) => v && setDriverBId(v)}>
                <SelectTrigger className="w-full bg-surface-2 border-border" style={colorB ? { borderTopColor: colorB, borderTopWidth: 2 } : undefined}>
                  <SelectValue placeholder="Select Driver B…" />
                </SelectTrigger>
                <SelectContent className="bg-surface-2 border-border">
                  {standings?.map((d) => (
                    <SelectItem key={d.Driver.driverId} value={d.Driver.driverId} disabled={d.Driver.driverId === driverAId}>
                      P{d.position} · {d.Driver.givenName} {d.Driver.familyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {bothSelected && !schedLoading && schedule && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Compare at circuit (optional)</p>
            <Select value={circuitId} onValueChange={(v) => v && setCircuitId(v)}>
              <SelectTrigger className="bg-surface-2 border-border w-full sm:w-[420px]">
                <SelectValue placeholder="🏁 Pick a circuit to see track history…" />
              </SelectTrigger>
              <SelectContent className="bg-surface-2 border-border">
                {schedule.map((race) => (
                  <SelectItem key={race.Circuit.circuitId} value={race.Circuit.circuitId}>
                    {race.Circuit.Location.country} — {race.Circuit.circuitName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {!bothSelected && !standLoading && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-5xl mb-4">🏗️</p>
          <p className="font-semibold text-foreground text-lg">
            {!driverAId && !driverBId
              ? "Select two drivers above to compare"
              : "Now pick a second driver to start the comparison"}
          </p>
          <p className="text-sm mt-1">Choose from the current 2026 championship standings</p>
        </div>
      )}

      {driverA && driverB && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {[{ d: driverA, color: colorA }, { d: driverB, color: colorB }].map(({ d, color }) => {
              const team = d.Constructors[0]?.name ?? "Unknown";
              return (
                <div key={d.Driver.driverId} className="rounded-lg bg-surface-2 border border-border p-4" style={{ borderTopColor: color, borderTopWidth: 3 }}>
                  <div className="flex items-center gap-3">
                    <TeamLogo team={team} size={40} />
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xl font-black tracking-tight" style={{ color }}>{d.Driver.code}</span>
                        <Badge className="text-xs px-1.5 py-0" style={{ backgroundColor: color + "33", color }}>P{d.position}</Badge>
                      </div>
                      <p className="text-sm font-semibold">{d.Driver.givenName} {d.Driver.familyName}</p>
                      <p className="text-xs text-muted-foreground">{team}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-lg bg-surface-2 border border-border p-5 space-y-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">2026 Season</p>
            <StatBar label="Points" a={parseFloat(driverA.points)} b={parseFloat(driverB.points)} colorA={colorA} colorB={colorB} />
            <StatBar label="Wins" a={parseInt(driverA.wins, 10)} b={parseInt(driverB.wins, 10)} colorA={colorA} colorB={colorB} />
            <StatBar label="Champ position (higher = better)" a={21 - parseInt(driverA.position, 10)} b={21 - parseInt(driverB.position, 10)} colorA={colorA} colorB={colorB} />
          </div>

          {seasonData && seasonData.stats.raceCompared > 0 && (
            <div className="rounded-lg bg-surface-2 border border-border p-5 space-y-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Season head-to-head · <span className="tabular-nums">{seasonData.stats.raceCompared}</span> shared races
              </p>
              <StatBar label="Finished ahead" a={seasonData.stats.raceAheadA} b={seasonData.stats.raceAheadB} colorA={colorA} colorB={colorB} />
              <StatBar label="Out-qualified" a={seasonData.stats.qualiAheadA} b={seasonData.stats.qualiAheadB} colorA={colorA} colorB={colorB} />
              <StatBar label="Podiums" a={seasonData.stats.a.podiums} b={seasonData.stats.b.podiums} colorA={colorA} colorB={colorB} />
              <StatBar label="Poles" a={seasonData.stats.a.poles} b={seasonData.stats.b.poles} colorA={colorA} colorB={colorB} />
            </div>
          )}

          <CircuitHistory
            circuitId={circuitId}
            selectedCircuit={selectedCircuit}
            driverA={driverA}
            driverB={driverB}
            colorA={colorA}
            colorB={colorB}
            compareData={compareData}
            compareLoading={compareLoading}
            compareError={Boolean(compareError)}
            circuitStats={circuitStats}
          />
        </div>
      )}
    </>
  );
}
