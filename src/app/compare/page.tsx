"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { DriverStanding, ConstructorStanding, Race } from "@/lib/types";
import { getTeamColor } from "@/lib/constants";
import TeamLogo from "@/components/ui/TeamLogo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ConstructorH2HResult } from "@/lib/stats/constructorH2H";

interface ConstructorContext {
  position: number | null;
  wins: number;
  bestFinish: number | null;
  racesEntered: number;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DriverResult {
  race: {
    position: number | null;
    points: number;
    status: string;
    fastestLap: string | null;
    hasFastestLap: boolean;
  } | null;
  quali: { position: number | null; bestTime: string | null } | null;
}
interface CircuitYearRow { year: number; a: DriverResult; b: DriverResult }
interface CompareData { circuitId: string; history: CircuitYearRow[] }

interface SeasonStats {
  raceCompared: number;
  raceAheadA: number;
  raceAheadB: number;
  qualiCompared: number;
  qualiAheadA: number;
  qualiAheadB: number;
  a: { podiums: number; poles: number };
  b: { podiums: number; poles: number };
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchStandings(): Promise<DriverStanding[]> {
  const res = await fetch("/api/standings?season=current");
  if (!res.ok) throw new Error("Failed to load standings");
  return res.json().then((d) => Array.isArray(d.drivers) ? d.drivers : []);
}

async function fetchConstructorStandings(): Promise<ConstructorStanding[]> {
  const res = await fetch("/api/standings?season=current");
  if (!res.ok) throw new Error("Failed to load standings");
  return res.json().then((d) => Array.isArray(d.constructors) ? d.constructors : []);
}

async function fetchSchedule(): Promise<Race[]> {
  const res = await fetch("/api/schedule?season=current");
  if (!res.ok) throw new Error("Failed to load schedule");
  return res.json().then((d) => Array.isArray(d.races) ? d.races : []);
}

async function fetchCompare(dA: string, dB: string, cId: string): Promise<CompareData> {
  const res = await fetch(
    `/api/compare?driverA=${encodeURIComponent(dA)}&driverB=${encodeURIComponent(dB)}&circuitId=${encodeURIComponent(cId)}`
  );
  if (!res.ok) throw new Error("Failed to load comparison");
  return res.json();
}

async function fetchSeasonCompare(dA: string, dB: string): Promise<{ stats: SeasonStats }> {
  const res = await fetch(
    `/api/compare?view=season&driverA=${encodeURIComponent(dA)}&driverB=${encodeURIComponent(dB)}`
  );
  if (!res.ok) throw new Error("Failed to load season comparison");
  return res.json();
}

async function fetchTeamsCompare(cA: string, cB: string, season: string): Promise<{ stats: ConstructorH2HResult; context: { a: ConstructorContext; b: ConstructorContext }; season: string }> {
  const res = await fetch(
    `/api/compare?view=teams&constructorA=${encodeURIComponent(cA)}&constructorB=${encodeURIComponent(cB)}&season=${encodeURIComponent(season)}`
  );
  if (!res.ok) throw new Error("Failed to load constructor comparison");
  return res.json();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBar({
  label, a, b, colorA, colorB,
}: { label: string; a: number; b: number; colorA: string; colorB: string }) {
  const total = a + b || 1;
  const pctA = Math.round((a / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-mono">
        <span style={{ color: colorA }} className={a > b ? "font-bold" : ""}>{a}</span>
        <span className="text-muted-foreground/50 text-[10px] uppercase tracking-wider">{label}</span>
        <span style={{ color: colorB }} className={b > a ? "font-bold" : ""}>{b}</span>
      </div>
      <div className="flex h-2 rounded overflow-hidden bg-surface-3">
        <div style={{ width: `${pctA}%`, backgroundColor: colorA }} className="transition-all" />
        <div style={{ flex: 1, backgroundColor: colorB }} className="transition-all" />
      </div>
    </div>
  );
}

function Pos({
  pos, status, fastest, color,
}: { pos: number | null; status?: string; fastest?: boolean; color: string }) {
  if (pos === null && status && !["Finished", ""].includes(status)) {
    return <span className="text-xs text-muted-foreground font-mono tabular-nums">{status.slice(0, 3)}</span>;
  }
  if (!pos) return <span className="text-xs text-muted-foreground/30">—</span>;
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="text-sm font-bold font-mono tabular-nums" style={{ color: pos <= 3 ? color : "var(--foreground)" }}>
        P{pos}
      </span>
      {fastest && <span className="text-[9px] text-accent-2 leading-none">⚡</span>}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComparePage() {
  // Drivers tab state
  const [driverAId, setDriverAId] = useState("");
  const [driverBId, setDriverBId] = useState("");
  const [circuitId, setCircuitId] = useState("");

  // Teams tab state
  const [constructorAId, setConstructorAId] = useState("");
  const [constructorBId, setConstructorBId] = useState("");
  const [teamsSeason, setTeamsSeason] = useState(String(new Date().getFullYear()));

  const { data: standings, isLoading: standLoading } = useQuery({
    queryKey: ["compare-standings"],
    queryFn: fetchStandings,
    staleTime: 5 * 60 * 1000,
  });

  const { data: constructorStandings } = useQuery({
    queryKey: ["compare-constructor-standings"],
    queryFn: fetchConstructorStandings,
    staleTime: 5 * 60 * 1000,
  });

  const { data: schedule, isLoading: schedLoading } = useQuery({
    queryKey: ["compare-schedule"],
    queryFn: fetchSchedule,
    staleTime: 10 * 60 * 1000,
  });

  const driverA = standings?.find((d) => d.Driver.driverId === driverAId);
  const driverB = standings?.find((d) => d.Driver.driverId === driverBId);
  const bothSelected = Boolean(driverA && driverB);

  const colorA = getTeamColor(driverA?.Constructors[0]?.name ?? "");
  const colorB = getTeamColor(driverB?.Constructors[0]?.name ?? "");

  const { data: compareData, isLoading: compareLoading, isError: compareError } = useQuery({
    queryKey: ["circuit-compare", driverAId, driverBId, circuitId],
    queryFn: () => fetchCompare(driverAId, driverBId, circuitId),
    enabled: bothSelected && Boolean(circuitId),
    staleTime: 5 * 60 * 1000,
  });

  const { data: seasonData } = useQuery({
    queryKey: ["season-compare", driverAId, driverBId],
    queryFn: () => fetchSeasonCompare(driverAId, driverBId),
    enabled: bothSelected,
    staleTime: 5 * 60 * 1000,
  });

  const bothTeamsSelected = Boolean(constructorAId && constructorBId);
  const constructorA = constructorStandings?.find((c) => c.Constructor.constructorId === constructorAId);
  const constructorB = constructorStandings?.find((c) => c.Constructor.constructorId === constructorBId);
  const teamColorA = getTeamColor(constructorA?.Constructor.name ?? "");
  const teamColorB = getTeamColor(constructorB?.Constructor.name ?? "");

  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ["teams-compare", constructorAId, constructorBId, teamsSeason],
    queryFn: () => fetchTeamsCompare(constructorAId, constructorBId, teamsSeason),
    enabled: bothTeamsSelected,
    staleTime: 5 * 60 * 1000,
  });

  const selectedCircuit = schedule?.find((r) => r.Circuit.circuitId === circuitId);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Head-to-Head</h1>
      <p className="text-muted-foreground text-sm mb-6">Driver or constructor comparison — season stats &amp; circuit history</p>

      <Tabs defaultValue="drivers">
        <TabsList className="bg-surface-2 mb-6">
          <TabsTrigger value="drivers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Drivers
          </TabsTrigger>
          <TabsTrigger value="teams" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Constructors
          </TabsTrigger>
        </TabsList>

        {/* ── Drivers tab ─────────────────────────────────────────────────── */}
        <TabsContent value="drivers">
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
                {!driverAId && !driverBId ? "Select two drivers above to compare" : "Now pick a second driver to start the comparison"}
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

              {circuitId && (
                <div className="rounded-lg bg-surface-2 border border-border p-5">
                  <h2 className="text-base font-semibold mb-0.5">🏁 {selectedCircuit?.Circuit.circuitName ?? circuitId}</h2>
                  <p className="text-xs text-muted-foreground mb-4">Last 4 seasons · race finish &amp; qualifying position</p>
                  {compareLoading && <div className="space-y-2">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-10" />)}</div>}
                  {compareError && <p className="text-muted-foreground text-sm">Could not load circuit history.</p>}
                  {compareData && compareData.history.length === 0 && (
                    <p className="text-muted-foreground text-sm">No data found — this may be a brand-new venue or neither driver competed here in the last 4 seasons.</p>
                  )}
                  {compareData && compareData.history.length > 0 && (() => {
                    const hist = compareData.history;
                    const winsA = hist.filter((h) => h.a.race?.position === 1).length;
                    const winsB = hist.filter((h) => h.b.race?.position === 1).length;
                    const podA = hist.filter((h) => (h.a.race?.position ?? 99) <= 3).length;
                    const podB = hist.filter((h) => (h.b.race?.position ?? 99) <= 3).length;
                    const bqA = Math.min(...hist.map((h) => h.a.quali?.position ?? 99));
                    const bqB = Math.min(...hist.map((h) => h.b.quali?.position ?? 99));
                    const bqTimeA = hist.flatMap((h) => h.a.quali?.bestTime ? [h.a.quali.bestTime] : []).sort()[0];
                    const bqTimeB = hist.flatMap((h) => h.b.quali?.bestTime ? [h.b.quali.bestTime] : []).sort()[0];
                    return (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                          {[
                            { label: "Wins", vA: String(winsA), vB: String(winsB) },
                            { label: "Podiums", vA: String(podA), vB: String(podB) },
                            { label: "Best quali", vA: bqA < 99 ? `P${bqA}` : "—", vB: bqB < 99 ? `P${bqB}` : "—" },
                          ].map(({ label, vA, vB }) => (
                            <div key={label} className="rounded bg-surface-3/60 px-3 py-2 text-center">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                              <div className="flex items-baseline justify-center gap-1.5">
                                <span className="text-sm font-bold font-mono" style={{ color: colorA }}>{vA}</span>
                                <span className="text-[10px] text-muted-foreground/50">vs</span>
                                <span className="text-sm font-bold font-mono" style={{ color: colorB }}>{vB}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm min-w-[400px]">
                            <thead>
                              <tr className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">
                                <th className="text-left pb-2 font-normal w-14">Year</th>
                                <th className="text-center pb-2 font-normal" style={{ color: colorA + "bb" }}>{driverA.Driver.code} Race</th>
                                <th className="text-center pb-2 font-normal" style={{ color: colorA + "bb" }}>{driverA.Driver.code} Quali</th>
                                <th className="text-center pb-2 font-normal" style={{ color: colorB + "bb" }}>{driverB.Driver.code} Race</th>
                                <th className="text-center pb-2 font-normal" style={{ color: colorB + "bb" }}>{driverB.Driver.code} Quali</th>
                              </tr>
                            </thead>
                            <tbody>
                              {hist.map((row) => (
                                <tr key={row.year} className="border-t border-border/40 hover:bg-accent/20 transition-colors">
                                  <td className="py-2 font-mono text-muted-foreground text-xs tabular-nums">{row.year}</td>
                                  <td className="py-2 text-center"><Pos pos={row.a.race?.position ?? null} status={row.a.race?.status} fastest={row.a.race?.hasFastestLap} color={colorA} /></td>
                                  <td className="py-2 text-center"><Pos pos={row.a.quali?.position ?? null} color={colorA} /></td>
                                  <td className="py-2 text-center"><Pos pos={row.b.race?.position ?? null} status={row.b.race?.status} fastest={row.b.race?.hasFastestLap} color={colorB} /></td>
                                  <td className="py-2 text-center"><Pos pos={row.b.quali?.position ?? null} color={colorB} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {(bqTimeA || bqTimeB) && (
                          <div className="mt-4 pt-4 border-t border-border flex gap-6 text-sm">
                            <div>
                              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">Best quali time</p>
                              <span className="font-mono" style={{ color: colorA }}>{driverA.Driver.code}: {bqTimeA ?? "—"}</span>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">&nbsp;</p>
                              <span className="font-mono" style={{ color: colorB }}>{driverB.Driver.code}: {bqTimeB ?? "—"}</span>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {bothSelected && !circuitId && (
                <p className="text-center text-muted-foreground text-sm py-4">↑ Select a circuit above to compare track-specific history</p>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Teams tab ──────────────────────────────────────────────────────── */}
        <TabsContent value="teams">
          <div className="flex items-end gap-3 flex-wrap mb-8">
            <div className="flex-1 min-w-36">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Constructor A</p>
              <Select value={constructorAId} onValueChange={(v) => v && setConstructorAId(v)}>
                <SelectTrigger className="w-full bg-surface-2 border-border" style={teamColorA ? { borderTopColor: teamColorA, borderTopWidth: 2 } : undefined}>
                  <SelectValue placeholder="Select Team A…" />
                </SelectTrigger>
                <SelectContent className="bg-surface-2 border-border">
                  {constructorStandings?.map((c) => (
                    <SelectItem key={c.Constructor.constructorId} value={c.Constructor.constructorId} disabled={c.Constructor.constructorId === constructorBId}>
                      P{c.position} · {c.Constructor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-muted-foreground/50 font-bold mb-2 shrink-0">vs</span>
            <div className="flex-1 min-w-36">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Constructor B</p>
              <Select value={constructorBId} onValueChange={(v) => v && setConstructorBId(v)}>
                <SelectTrigger className="w-full bg-surface-2 border-border" style={teamColorB ? { borderTopColor: teamColorB, borderTopWidth: 2 } : undefined}>
                  <SelectValue placeholder="Select Team B…" />
                </SelectTrigger>
                <SelectContent className="bg-surface-2 border-border">
                  {constructorStandings?.map((c) => (
                    <SelectItem key={c.Constructor.constructorId} value={c.Constructor.constructorId} disabled={c.Constructor.constructorId === constructorAId}>
                      P{c.position} · {c.Constructor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="shrink-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Season</p>
              <Select value={teamsSeason} onValueChange={(v) => v && setTeamsSeason(v)}>
                <SelectTrigger className="bg-surface-2 border-border w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface-2 border-border">
                  {Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - i)).map((yr) => (
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
                          { ctx: teamsData.context.a, name: constructorA?.Constructor.name ?? constructorAId, color: teamColorA },
                          { ctx: teamsData.context.b, name: constructorB?.Constructor.name ?? constructorBId, color: teamColorB },
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
