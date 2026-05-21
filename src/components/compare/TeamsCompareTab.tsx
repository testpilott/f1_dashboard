"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { ConstructorH2HResult } from "@/lib/stats/constructorH2H";
import type { ConstructorStanding } from "@/lib/types";
import { getTeamColor } from "@/lib/constants";
import TeamLogo from "@/components/ui/TeamLogo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import StatBar from "@/components/compare/StatBar";

const CURRENT_YEAR = new Date().getFullYear();
const TEAM_SEASON_OPTIONS = Array.from({ length: 6 }, (_, i) => String(CURRENT_YEAR - i));

interface ConstructorContext {
  position: number | null;
  wins: number;
  bestFinish: number | null;
  racesEntered: number;
}

async function fetchConstructorStandings(season: string): Promise<ConstructorStanding[]> {
  const res = await fetch(`/api/standings?season=${encodeURIComponent(season)}`);
  if (!res.ok) throw new Error("Failed to load standings");
  return res.json().then((d) => (Array.isArray(d.constructors) ? d.constructors : []));
}

async function fetchTeamsCompare(
  cA: string,
  cB: string,
  season: string,
): Promise<{ stats: ConstructorH2HResult; context: { a: ConstructorContext; b: ConstructorContext }; season: string }> {
  const res = await fetch(
    `/api/compare?view=teams&constructorA=${encodeURIComponent(cA)}&constructorB=${encodeURIComponent(cB)}&season=${encodeURIComponent(season)}`,
  );
  if (!res.ok) throw new Error("Failed to load constructor comparison");
  return res.json();
}

export default function TeamsCompareTab() {
  const [constructorAId, setConstructorAId] = useState("");
  const [constructorBId, setConstructorBId] = useState("");
  const [teamsSeason, setTeamsSeason] = useState(String(CURRENT_YEAR));

  const { data: constructorStandings } = useQuery({
    queryKey: ["compare-constructor-standings", teamsSeason],
    queryFn: () => fetchConstructorStandings(teamsSeason),
    staleTime: 5 * 60 * 1000,
  });

  // Reset selections when the chosen season no longer contains the selected team
  const knownIds = constructorStandings?.map((c) => c.Constructor.constructorId) ?? [];
  const constructorAValid = !constructorAId || knownIds.includes(constructorAId);
  const constructorBValid = !constructorBId || knownIds.includes(constructorBId);

  const selectedConstructorAId = constructorAValid ? constructorAId : "";
  const selectedConstructorBId = constructorBValid ? constructorBId : "";
  const bothTeamsSelected = Boolean(selectedConstructorAId && selectedConstructorBId);
  const constructorA = constructorStandings?.find((c) => c.Constructor.constructorId === selectedConstructorAId);
  const constructorB = constructorStandings?.find((c) => c.Constructor.constructorId === selectedConstructorBId);
  const teamColorA = getTeamColor(constructorA?.Constructor.name ?? "");
  const teamColorB = getTeamColor(constructorB?.Constructor.name ?? "");

  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ["teams-compare", selectedConstructorAId, selectedConstructorBId, teamsSeason],
    queryFn: () => fetchTeamsCompare(selectedConstructorAId, selectedConstructorBId, teamsSeason),
    enabled: bothTeamsSelected,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <>
      <div className="flex items-end gap-3 flex-wrap mb-8">
        <div className="flex-1 min-w-36">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Constructor A</p>
            <Select value={selectedConstructorAId} onValueChange={(v) => v && setConstructorAId(v)}>
            <SelectTrigger className="w-full bg-surface-2 border-border" style={teamColorA ? { borderTopColor: teamColorA, borderTopWidth: 2 } : undefined}>
              <SelectValue placeholder="Select Team A…" />
              {!constructorAValid && <span className="text-[10px] text-destructive ml-1">Did not compete in {teamsSeason}</span>}
            </SelectTrigger>
            <SelectContent className="bg-surface-2 border-border">
              {constructorStandings?.map((c) => (
                  <SelectItem key={c.Constructor.constructorId} value={c.Constructor.constructorId} disabled={c.Constructor.constructorId === selectedConstructorBId}>
                  P{c.position} · {c.Constructor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-muted-foreground/50 font-bold mb-2 shrink-0">vs</span>
        <div className="flex-1 min-w-36">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Constructor B</p>
          <Select value={selectedConstructorBId} onValueChange={(v) => v && setConstructorBId(v)}>
            <SelectTrigger className="w-full bg-surface-2 border-border" style={teamColorB ? { borderTopColor: teamColorB, borderTopWidth: 2 } : undefined}>
              <SelectValue placeholder="Select Team B…" />
              {!constructorBValid && <span className="text-[10px] text-destructive ml-1">Did not compete in {teamsSeason}</span>}
            </SelectTrigger>
            <SelectContent className="bg-surface-2 border-border">
              {constructorStandings?.map((c) => (
                <SelectItem key={c.Constructor.constructorId} value={c.Constructor.constructorId} disabled={c.Constructor.constructorId === selectedConstructorAId}>
                  P{c.position} · {c.Constructor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="shrink-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Season</p>
          <Select value={teamsSeason} onValueChange={(v) => {
            if (!v) return;
            setTeamsSeason(v);
          }}>
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

      {!bothTeamsSelected && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-5xl mb-4">🏎️</p>
          <p className="font-semibold text-foreground text-lg">Select two constructors to compare</p>
          <p className="text-sm mt-1">2026 season head-to-head: points, wins, 1-2 finishes, and more</p>
        </div>
      )}

      {bothTeamsSelected && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {[{ c: constructorA, color: teamColorA }, { c: constructorB, color: teamColorB }].map(({ c, color }) => {
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

          {teamsData && teamsData.stats && (
            <>
              <div className="rounded-lg bg-surface-2 border border-border p-5 space-y-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{teamsSeason} Season</p>
                <StatBar label="Points" a={teamsData.stats.a.totalPoints} b={teamsData.stats.b.totalPoints} colorA={teamColorA} colorB={teamColorB} />
                <StatBar label="Wins" a={teamsData.stats.a.wins} b={teamsData.stats.b.wins} colorA={teamColorA} colorB={teamColorB} />
                <StatBar label="Podiums" a={teamsData.stats.a.podiums} b={teamsData.stats.b.podiums} colorA={teamColorA} colorB={teamColorB} />
                <StatBar label="1-2 Finishes" a={teamsData.stats.a.oneTwos} b={teamsData.stats.b.oneTwos} colorA={teamColorA} colorB={teamColorB} />
                <StatBar label="DNFs" a={teamsData.stats.a.dnfs} b={teamsData.stats.b.dnfs} colorA={teamColorA} colorB={teamColorB} />
              </div>

              {teamsData.context && (
                <div className="rounded-lg bg-surface-2 border border-border p-5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Championship context — {teamsSeason}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { ctx: teamsData.context.a, name: constructorA?.Constructor.name ?? selectedConstructorAId, color: teamColorA },
                      { ctx: teamsData.context.b, name: constructorB?.Constructor.name ?? selectedConstructorBId, color: teamColorB },
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
                  <StatBar label="Finished ahead" a={teamsData.stats.aheadA} b={teamsData.stats.aheadB} colorA={teamColorA} colorB={teamColorB} />
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    {[
                      { stats: teamsData.stats.a, color: teamColorA },
                      { stats: teamsData.stats.b, color: teamColorB },
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