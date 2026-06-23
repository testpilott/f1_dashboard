import { Skeleton } from "@/components/ui/skeleton";
import PositionBadge from "@/components/compare/PositionBadge";
import type { CircuitHeadToHead } from "@/lib/stats/circuitHeadToHead";
import type { CompareData, DriverResult } from "@/hooks/useDriverComparison";
import type { Race, DriverStanding } from "@/lib/types";

interface Props {
  circuitId: string;
  selectedCircuit: Race | undefined;
  driverA: DriverStanding;
  driverB: DriverStanding;
  colorA: string;
  colorB: string;
  compareData: CompareData | undefined;
  compareLoading: boolean;
  compareError: boolean;
  circuitStats: CircuitHeadToHead;
}

export default function CircuitHistory({
  circuitId,
  selectedCircuit,
  driverA,
  driverB,
  colorA,
  colorB,
  compareData,
  compareLoading,
  compareError,
  circuitStats,
}: Props) {
  if (!circuitId) {
    return (
      <p className="text-center text-muted-foreground text-sm py-4">
        ↑ Select a circuit above to compare track-specific history
      </p>
    );
  }

  return (
    <div className="rounded-lg bg-surface-2 border border-border p-5">
      <h2 className="text-base font-semibold mb-0.5">
        🏁 {selectedCircuit?.Circuit.circuitName ?? circuitId}
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        Last 4 seasons · race finish &amp; qualifying position
      </p>

      {compareLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      )}
      {compareError && (
        <p className="text-muted-foreground text-sm">Could not load circuit history.</p>
      )}
      {compareData && compareData.history.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No data found — this may be a brand-new venue or neither driver competed here in the
          last 4 seasons.
        </p>
      )}

      {compareData && compareData.history.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Wins", vA: String(circuitStats.winsA), vB: String(circuitStats.winsB) },
              {
                label: "Podiums",
                vA: String(circuitStats.podiumsA),
                vB: String(circuitStats.podiumsB),
              },
              {
                label: "Best quali",
                vA: circuitStats.bestQualiA != null ? `P${circuitStats.bestQualiA}` : "—",
                vB: circuitStats.bestQualiB != null ? `P${circuitStats.bestQualiB}` : "—",
              },
            ].map(({ label, vA, vB }) => (
              <div key={label} className="rounded bg-surface-3/60 px-3 py-2 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  {label}
                </p>
                <div className="flex items-baseline justify-center gap-1.5">
                  <span className="text-sm font-bold font-mono" style={{ color: colorA }}>
                    {vA}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50">vs</span>
                  <span className="text-sm font-bold font-mono" style={{ color: colorB }}>
                    {vB}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">
                  <th className="text-left pb-2 font-normal w-14">Year</th>
                  <th
                    className="text-center pb-2 font-normal"
                    style={{ color: colorA + "bb" }}
                  >
                    {driverA.Driver.code} Race
                  </th>
                  <th
                    className="text-center pb-2 font-normal"
                    style={{ color: colorA + "bb" }}
                  >
                    {driverA.Driver.code} Quali
                  </th>
                  <th
                    className="text-center pb-2 font-normal"
                    style={{ color: colorB + "bb" }}
                  >
                    {driverB.Driver.code} Race
                  </th>
                  <th
                    className="text-center pb-2 font-normal"
                    style={{ color: colorB + "bb" }}
                  >
                    {driverB.Driver.code} Quali
                  </th>
                </tr>
              </thead>
              <tbody>
                {compareData.history.map((row) => (
                  <tr
                    key={row.year}
                    className="border-t border-border/40 hover:bg-accent/20 transition-colors"
                  >
                    <td className="py-2 font-mono text-muted-foreground text-xs tabular-nums">
                      {row.year}
                    </td>
                    <td className="py-2 text-center">
                      <PositionBadge
                        pos={row.a.race?.position ?? null}
                        status={row.a.race?.status}
                        fastest={row.a.race?.hasFastestLap}
                        color={colorA}
                      />
                    </td>
                    <td className="py-2 text-center">
                      <PositionBadge pos={row.a.quali?.position ?? null} color={colorA} />
                    </td>
                    <td className="py-2 text-center">
                      <PositionBadge
                        pos={row.b.race?.position ?? null}
                        status={row.b.race?.status}
                        fastest={row.b.race?.hasFastestLap}
                        color={colorB}
                      />
                    </td>
                    <td className="py-2 text-center">
                      <PositionBadge pos={row.b.quali?.position ?? null} color={colorB} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(circuitStats.bestQualiTimeA || circuitStats.bestQualiTimeB) && (
            <div className="mt-4 pt-4 border-t border-border flex gap-6 text-sm">
              <div>
                <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">
                  Best quali time
                </p>
                <span className="font-mono" style={{ color: colorA }}>
                  {driverA.Driver.code}: {circuitStats.bestQualiTimeA ?? "—"}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">
                  &nbsp;
                </p>
                <span className="font-mono" style={{ color: colorB }}>
                  {driverB.Driver.code}: {circuitStats.bestQualiTimeB ?? "—"}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
