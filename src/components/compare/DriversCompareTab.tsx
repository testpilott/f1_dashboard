"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { DriverStanding, Race } from "@/lib/types";
import { getTeamColor } from "@/lib/constants";
import TeamLogo from "@/components/ui/TeamLogo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { circuitHeadToHead, type CircuitComparisonRow } from "@/lib/stats/circuitHeadToHead";
import StatBar from "@/components/compare/StatBar";
import PositionBadge from "@/components/compare/PositionBadge";

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

interface CompareData {
  circuitId: string;
  history: Array<{ year: number; a: DriverResult; b: DriverResult }>;
}

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

async function fetchStandings(): Promise<DriverStanding[]> {
  const res = await fetch("/api/standings?season=current");
  if (!res.ok) throw new Error("Failed to load standings");
  return res.json().then((d) => (Array.isArray(d.drivers) ? d.drivers : []));
}

async function fetchSchedule(): Promise<Race[]> {
  const res = await fetch("/api/schedule?season=current");
  if (!res.ok) throw new Error("Failed to load schedule");
  return res.json().then((d) => (Array.isArray(d.races) ? d.races : []));
}

async function fetchCompare(dA: string, dB: string, cId: string): Promise<CompareData> {
  const res = await fetch(
    `/api/compare?driverA=${encodeURIComponent(dA)}&driverB=${encodeURIComponent(dB)}&circuitId=${encodeURIComponent(cId)}`,
  );
  if (!res.ok) throw new Error("Failed to load comparison");
  return res.json();
}

async function fetchSeasonCompare(dA: string, dB: string): Promise<{ stats: SeasonStats }> {
  const res = await fetch(
    `/api/compare?view=season&driverA=${encodeURIComponent(dA)}&driverB=${encodeURIComponent(dB)}`,
  );
  if (!res.ok) throw new Error("Failed to load season comparison");
  return res.json();
}

export default function DriversCompareTab() {
  const [driverAId, setDriverAId] = useState("");
  const [driverBId, setDriverBId] = useState("");
  const [circuitId, setCircuitId] = useState("");

  const { data: standings, isLoading: standLoading } = useQuery({
    queryKey: ["compare-standings"],
    queryFn: fetchStandings,
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

  const selectedCircuit = schedule?.find((r) => r.Circuit.circuitId === circuitId);

  const circuitStats = useMemo(() => {
    const history: CircuitComparisonRow[] = compareData?.history ?? [];
    return circuitHeadToHead(history);
  }, [compareData?.history]);

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
              {compareLoading && <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10" />)}</div>}
              {compareError && <p className="text-muted-foreground text-sm">Could not load circuit history.</p>}
              {compareData && compareData.history.length === 0 && (
                <p className="text-muted-foreground text-sm">No data found — this may be a brand-new venue or neither driver competed here in the last 4 seasons.</p>
              )}
              {compareData && compareData.history.length > 0 && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    {[
                      { label: "Wins", vA: String(circuitStats.winsA), vB: String(circuitStats.winsB) },
                      { label: "Podiums", vA: String(circuitStats.podiumsA), vB: String(circuitStats.podiumsB) },
                      {
                        label: "Best quali",
                        vA: circuitStats.bestQualiA != null ? `P${circuitStats.bestQualiA}` : "—",
                        vB: circuitStats.bestQualiB != null ? `P${circuitStats.bestQualiB}` : "—",
                      },
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
                        {compareData.history.map((row) => (
                          <tr key={row.year} className="border-t border-border/40 hover:bg-accent/20 transition-colors">
                            <td className="py-2 font-mono text-muted-foreground text-xs tabular-nums">{row.year}</td>
                            <td className="py-2 text-center"><PositionBadge pos={row.a.race?.position ?? null} status={row.a.race?.status} fastest={row.a.race?.hasFastestLap} color={colorA} /></td>
                            <td className="py-2 text-center"><PositionBadge pos={row.a.quali?.position ?? null} color={colorA} /></td>
                            <td className="py-2 text-center"><PositionBadge pos={row.b.race?.position ?? null} status={row.b.race?.status} fastest={row.b.race?.hasFastestLap} color={colorB} /></td>
                            <td className="py-2 text-center"><PositionBadge pos={row.b.quali?.position ?? null} color={colorB} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {(circuitStats.bestQualiTimeA || circuitStats.bestQualiTimeB) && (
                    <div className="mt-4 pt-4 border-t border-border flex gap-6 text-sm">
                      <div>
                        <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">Best quali time</p>
                        <span className="font-mono" style={{ color: colorA }}>{driverA.Driver.code}: {circuitStats.bestQualiTimeA ?? "—"}</span>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">&nbsp;</p>
                        <span className="font-mono" style={{ color: colorB }}>{driverB.Driver.code}: {circuitStats.bestQualiTimeB ?? "—"}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {bothSelected && !circuitId && (
            <p className="text-center text-muted-foreground text-sm py-4">↑ Select a circuit above to compare track-specific history</p>
          )}
        </div>
      )}
    </>
  );
}