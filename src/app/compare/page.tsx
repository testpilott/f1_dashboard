"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { DriverStanding, Race } from "@/lib/types";
import { getTeamColor } from "@/lib/constants";
import TeamLogo from "@/components/ui/TeamLogo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

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

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchStandings(): Promise<DriverStanding[]> {
  const res = await fetch("/api/standings?season=current");
  if (!res.ok) throw new Error("Failed to load standings");
  return res.json().then((d) => Array.isArray(d.drivers) ? d.drivers : []);
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
        <span className="text-zinc-500 text-[10px] uppercase tracking-wider">{label}</span>
        <span style={{ color: colorB }} className={b > a ? "font-bold" : ""}>{b}</span>
      </div>
      <div className="flex h-2 rounded overflow-hidden bg-zinc-800">
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
    return <span className="text-xs text-zinc-500 font-mono">{status.slice(0, 3)}</span>;
  }
  if (!pos) return <span className="text-xs text-zinc-700">—</span>;
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="text-sm font-bold font-mono" style={{ color: pos <= 3 ? color : "#e4e4e7" }}>
        P{pos}
      </span>
      {fastest && <span className="text-[9px] text-purple-400 leading-none">⚡</span>}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComparePage() {
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

  const selectedCircuit = schedule?.find((r) => r.Circuit.circuitId === circuitId);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Driver Head-to-Head</h1>
      <p className="text-zinc-500 text-sm mb-6">Season stats + circuit history for the last 4 years</p>

      {/* ── Selectors ── */}
      <div className="space-y-4 mb-8">
        {standLoading ? (
          <Skeleton className="h-9 w-full bg-zinc-800" />
        ) : (
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-36">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Driver A</p>
              <Select value={driverAId} onValueChange={(v) => v && setDriverAId(v)}>
                <SelectTrigger
                  className="w-full bg-zinc-900 border-zinc-700"
                  style={colorA ? { borderTopColor: colorA, borderTopWidth: 2 } : undefined}
                >
                  <SelectValue placeholder="Select Driver A…" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {standings?.map((d) => (
                    <SelectItem
                      key={d.Driver.driverId}
                      value={d.Driver.driverId}
                      disabled={d.Driver.driverId === driverBId}
                    >
                      P{d.position} · {d.Driver.givenName} {d.Driver.familyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <span className="text-zinc-600 font-bold mb-2 shrink-0">vs</span>

            <div className="flex-1 min-w-36">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Driver B</p>
              <Select value={driverBId} onValueChange={(v) => v && setDriverBId(v)}>
                <SelectTrigger
                  className="w-full bg-zinc-900 border-zinc-700"
                  style={colorB ? { borderTopColor: colorB, borderTopWidth: 2 } : undefined}
                >
                  <SelectValue placeholder="Select Driver B…" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {standings?.map((d) => (
                    <SelectItem
                      key={d.Driver.driverId}
                      value={d.Driver.driverId}
                      disabled={d.Driver.driverId === driverAId}
                    >
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
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
              Compare at circuit (optional)
            </p>
            <Select value={circuitId} onValueChange={(v) => v && setCircuitId(v)}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 w-full sm:w-[420px]">
                <SelectValue placeholder="🏁 Pick a circuit to see track history…" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
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

      {/* ── Empty prompt ── */}
      {!bothSelected && !standLoading && (
        <div className="text-center py-16 text-zinc-500">
          <p className="text-5xl mb-4">🏎️</p>
          <p className="font-semibold text-zinc-400 text-lg">
            {!driverAId && !driverBId
              ? "Select two drivers above to compare"
              : "Now pick a second driver to start the comparison"}
          </p>
          <p className="text-sm mt-1">Choose from the current 2026 championship standings</p>
        </div>
      )}

      {/* ── Comparison content ── */}
      {driverA && driverB && (
        <div className="space-y-5">
          {/* Driver header cards */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { d: driverA, color: colorA },
              { d: driverB, color: colorB },
            ].map(({ d, color }) => {
              const team = d.Constructors[0]?.name ?? "Unknown";
              return (
                <div
                  key={d.Driver.driverId}
                  className="rounded-lg bg-zinc-900 border border-zinc-800 p-4"
                  style={{ borderTopColor: color, borderTopWidth: 3 }}
                >
                  <div className="flex items-center gap-3">
                    <TeamLogo team={team} size={40} />
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xl font-black tracking-tight" style={{ color }}>
                          {d.Driver.code}
                        </span>
                        <Badge
                          className="text-xs px-1.5 py-0"
                          style={{ backgroundColor: color + "33", color }}
                        >
                          P{d.position}
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold">
                        {d.Driver.givenName} {d.Driver.familyName}
                      </p>
                      <p className="text-xs text-zinc-500">{team}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Season stat bars */}
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-5 space-y-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">2026 Season</p>
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
              label="Champ position (higher = better)"
              a={21 - parseInt(driverA.position, 10)}
              b={21 - parseInt(driverB.position, 10)}
              colorA={colorA}
              colorB={colorB}
            />
          </div>

          {/* Circuit history */}
          {circuitId && (
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-5">
              <h2 className="text-base font-semibold mb-0.5">
                🏁 {selectedCircuit?.Circuit.circuitName ?? circuitId}
              </h2>
              <p className="text-xs text-zinc-500 mb-4">
                Last 4 seasons · race finish &amp; qualifying position
              </p>

              {compareLoading && (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-10 bg-zinc-800" />
                  ))}
                </div>
              )}

              {compareError && (
                <p className="text-zinc-500 text-sm">Could not load circuit history.</p>
              )}

              {compareData && compareData.history.length === 0 && (
                <p className="text-zinc-500 text-sm">
                  No data found — this may be a brand-new venue or neither driver competed
                  here in the last 4 seasons.
                </p>
              )}

              {compareData && compareData.history.length > 0 && (() => {
                const hist = compareData.history;
                const winsA = hist.filter((h) => h.a.race?.position === 1).length;
                const winsB = hist.filter((h) => h.b.race?.position === 1).length;
                const podA = hist.filter((h) => (h.a.race?.position ?? 99) <= 3).length;
                const podB = hist.filter((h) => (h.b.race?.position ?? 99) <= 3).length;
                const bqA = Math.min(...hist.map((h) => h.a.quali?.position ?? 99));
                const bqB = Math.min(...hist.map((h) => h.b.quali?.position ?? 99));
                const bestLapA = hist.flatMap((h) => h.a.race?.fastestLap ? [h.a.race.fastestLap] : []).sort()[0];
                const bestLapB = hist.flatMap((h) => h.b.race?.fastestLap ? [h.b.race.fastestLap] : []).sort()[0];
                const bqTimeA = hist.flatMap((h) => h.a.quali?.bestTime ? [h.a.quali.bestTime] : []).sort()[0];
                const bqTimeB = hist.flatMap((h) => h.b.quali?.bestTime ? [h.b.quali.bestTime] : []).sort()[0];

                return (
                  <>
                    {/* Summary tiles */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                      {[
                        { label: "Wins", vA: String(winsA), vB: String(winsB) },
                        { label: "Podiums", vA: String(podA), vB: String(podB) },
                        { label: "Best quali", vA: bqA < 99 ? `P${bqA}` : "—", vB: bqB < 99 ? `P${bqB}` : "—" },
                        { label: "Best race lap", vA: bestLapA ?? "—", vB: bestLapB ?? "—" },
                      ].map(({ label, vA, vB }) => (
                        <div key={label} className="rounded bg-zinc-800/60 px-3 py-2 text-center">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                            {label}
                          </p>
                          <div className="flex items-baseline justify-center gap-1.5">
                            <span className="text-sm font-bold font-mono" style={{ color: colorA }}>
                              {vA}
                            </span>
                            <span className="text-[10px] text-zinc-600">vs</span>
                            <span className="text-sm font-bold font-mono" style={{ color: colorB }}>
                              {vB}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Year-by-year table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[400px]">
                        <thead>
                          <tr className="text-[10px] text-zinc-600 uppercase tracking-wider">
                            <th className="text-left pb-2 font-normal w-14">Year</th>
                            <th className="text-center pb-2 font-normal" style={{ color: colorA + "bb" }}>
                              {driverA.Driver.code} Race
                            </th>
                            <th className="text-center pb-2 font-normal" style={{ color: colorA + "bb" }}>
                              {driverA.Driver.code} Quali
                            </th>
                            <th className="text-center pb-2 font-normal" style={{ color: colorB + "bb" }}>
                              {driverB.Driver.code} Race
                            </th>
                            <th className="text-center pb-2 font-normal" style={{ color: colorB + "bb" }}>
                              {driverB.Driver.code} Quali
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {hist.map((row) => (
                            <tr
                              key={row.year}
                              className="border-t border-zinc-800/60 hover:bg-zinc-800/30 transition-colors"
                            >
                              <td className="py-2 font-mono text-zinc-400 text-xs">{row.year}</td>
                              <td className="py-2 text-center">
                                <Pos
                                  pos={row.a.race?.position ?? null}
                                  status={row.a.race?.status}
                                  fastest={row.a.race?.hasFastestLap}
                                  color={colorA}
                                />
                              </td>
                              <td className="py-2 text-center">
                                <Pos pos={row.a.quali?.position ?? null} color={colorA} />
                              </td>
                              <td className="py-2 text-center">
                                <Pos
                                  pos={row.b.race?.position ?? null}
                                  status={row.b.race?.status}
                                  fastest={row.b.race?.hasFastestLap}
                                  color={colorB}
                                />
                              </td>
                              <td className="py-2 text-center">
                                <Pos pos={row.b.quali?.position ?? null} color={colorB} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Best quali times */}
                    {(bqTimeA || bqTimeB) && (
                      <div className="mt-4 pt-4 border-t border-zinc-800 flex gap-6 text-sm">
                        <div>
                          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">
                            Best quali time
                          </p>
                          <span className="font-mono" style={{ color: colorA }}>
                            {driverA.Driver.code}: {bqTimeA ?? "—"}
                          </span>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">
                            &nbsp;
                          </p>
                          <span className="font-mono" style={{ color: colorB }}>
                            {driverB.Driver.code}: {bqTimeB ?? "—"}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {bothSelected && !circuitId && (
            <p className="text-center text-zinc-500 text-sm py-4">
              ↑ Select a circuit above to compare track-specific history
            </p>
          )}
        </div>
      )}
    </div>
  );
}

