"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import TeamLogo from "@/components/ui/TeamLogo";
import StatBar from "@/components/compare/StatBar";
import { useTeamsComparison, TEAM_SEASON_OPTIONS } from "@/hooks/useTeamsComparison";

export default function TeamsCompareTab() {
  const [constructorAId, setConstructorAId] = useState("");
  const [constructorBId, setConstructorBId] = useState("");
  const [season, setSeason] = useState(TEAM_SEASON_OPTIONS[0]);

  const {
    constructorStandings,
    constructorA,
    constructorB,
    colorA,
    colorB,
    selectedAId,
    selectedBId,
    bothSelected,
    teamsData,
    teamsLoading,
    constructorAValid,
    constructorBValid,
  } = useTeamsComparison(constructorAId, constructorBId, season);

  return (
    <>
      <div className="flex items-end gap-3 flex-wrap mb-8">
        <div className="flex-1 min-w-36">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Constructor A</p>
          <Select value={selectedAId} onValueChange={(v) => v && setConstructorAId(v)}>
            <SelectTrigger className="w-full bg-surface-2 border-border" style={colorA ? { borderTopColor: colorA, borderTopWidth: 2 } : undefined}>
              <SelectValue placeholder="Select Team A…" />
              {!constructorAValid && (
                <span className="text-[10px] text-destructive ml-1">Did not compete in {season}</span>
              )}
            </SelectTrigger>
            <SelectContent className="bg-surface-2 border-border">
              {constructorStandings?.map((c) => (
                <SelectItem key={c.Constructor.constructorId} value={c.Constructor.constructorId} disabled={c.Constructor.constructorId === selectedBId}>
                  P{c.position} · {c.Constructor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span className="text-muted-foreground/50 font-bold mb-2 shrink-0">vs</span>

        <div className="flex-1 min-w-36">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Constructor B</p>
          <Select value={selectedBId} onValueChange={(v) => v && setConstructorBId(v)}>
            <SelectTrigger className="w-full bg-surface-2 border-border" style={colorB ? { borderTopColor: colorB, borderTopWidth: 2 } : undefined}>
              <SelectValue placeholder="Select Team B…" />
              {!constructorBValid && (
                <span className="text-[10px] text-destructive ml-1">Did not compete in {season}</span>
              )}
            </SelectTrigger>
            <SelectContent className="bg-surface-2 border-border">
              {constructorStandings?.map((c) => (
                <SelectItem key={c.Constructor.constructorId} value={c.Constructor.constructorId} disabled={c.Constructor.constructorId === selectedAId}>
                  P{c.position} · {c.Constructor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="shrink-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Season</p>
          <Select value={season} onValueChange={(v) => v && setSeason(v)}>
            <SelectTrigger className="bg-surface-2 border-border w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface-2 border-border">
              {TEAM_SEASON_OPTIONS.map((yr) => (
                <SelectItem key={yr} value={yr}>{yr}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!bothSelected && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-5xl mb-4">🏎️</p>
          <p className="font-semibold text-foreground text-lg">Select two constructors to compare</p>
          <p className="text-sm mt-1">2026 season head-to-head: points, wins, 1-2 finishes, and more</p>
        </div>
      )}

      {bothSelected && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {[{ c: constructorA, color: colorA }, { c: constructorB, color: colorB }].map(({ c, color }) => {
              if (!c) return null;
              return (
                <div key={c.Constructor.constructorId} className="rounded-lg bg-surface-2 border border-border p-4" style={{ borderTopColor: color, borderTopWidth: 3 }}>
                  <div className="flex items-center gap-3">
                    <TeamLogo team={c.Constructor.name} size={40} />
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge className="text-xs px-1.5 py-0" style={{ backgroundColor: color + "33", color }}>P{c.position}</Badge>
                      </div>
                      <p className="text-sm font-semibold">{c.Constructor.name}</p>
                      <p className="text-xs text-muted-foreground font-mono tabular-nums">{c.points} pts</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {teamsLoading && <Skeleton className="h-40 w-full" />}

          {teamsData?.stats && (
            <>
              <div className="rounded-lg bg-surface-2 border border-border p-5 space-y-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{season} Season</p>
                <StatBar label="Points" a={teamsData.stats.a.totalPoints} b={teamsData.stats.b.totalPoints} colorA={colorA} colorB={colorB} />
                <StatBar label="Wins" a={teamsData.stats.a.wins} b={teamsData.stats.b.wins} colorA={colorA} colorB={colorB} />
                <StatBar label="Podiums" a={teamsData.stats.a.podiums} b={teamsData.stats.b.podiums} colorA={colorA} colorB={colorB} />
                <StatBar label="1-2 Finishes" a={teamsData.stats.a.oneTwos} b={teamsData.stats.b.oneTwos} colorA={colorA} colorB={colorB} />
                <StatBar label="DNFs" a={teamsData.stats.a.dnfs} b={teamsData.stats.b.dnfs} colorA={colorA} colorB={colorB} />
              </div>

              {teamsData.context && (
                <div className="rounded-lg bg-surface-2 border border-border p-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                    Championship context — {season}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { ctx: teamsData.context.a, name: constructorA?.Constructor.name ?? selectedAId, color: colorA },
                      { ctx: teamsData.context.b, name: constructorB?.Constructor.name ?? selectedBId, color: colorB },
                    ].map(({ ctx, name, color }) => (
                      <div key={name} className="rounded bg-surface-3/60 p-3 space-y-2">
                        <p className="text-xs font-semibold truncate" style={{ color }}>{name}</p>
                        <div className="grid grid-cols-2 gap-1 text-center">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Champ P</p>
                            <p className="font-mono font-bold text-sm">{ctx.position != null ? `P${ctx.position}` : "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Wins</p>
                            <p className="font-mono font-bold text-sm">{ctx.wins}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Best Finish</p>
                            <p className="font-mono font-bold text-sm">{ctx.bestFinish != null ? `P${ctx.bestFinish}` : "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Races</p>
                            <p className="font-mono font-bold text-sm">{ctx.racesEntered}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {teamsData.stats.racesCompared > 0 && (
                <div className="rounded-lg bg-surface-2 border border-border p-5 space-y-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Race-by-race (best driver per team) · <span className="tabular-nums">{teamsData.stats.racesCompared}</span> races
                  </p>
                  <StatBar label="Finished ahead" a={teamsData.stats.aheadA} b={teamsData.stats.aheadB} colorA={colorA} colorB={colorB} />
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    {[
                      { stats: teamsData.stats.a, color: colorA },
                      { stats: teamsData.stats.b, color: colorB },
                    ].map(({ stats, color }) => (
                      <div key={stats.constructorId} className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg best finish</p>
                        <p className="font-mono font-bold text-lg" style={{ color }}>
                          P{stats.avgBestFinish.toFixed(1)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
