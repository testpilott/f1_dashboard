import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import type { DriverSeasonSummary } from "@/lib/stats/driverSeason";

interface StatBoxProps {
  label: string;
  value: string | number;
}

function StatBox({ label, value }: StatBoxProps) {
  return (
    <div className="flex flex-col items-center gap-0.5 bg-surface-3 rounded-lg px-3 py-2 min-w-[60px]">
      <span className="text-lg font-bold leading-none tabular-nums">{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
    </div>
  );
}

interface DriverSeasonStatsProps {
  summary: DriverSeasonSummary;
}

export function DriverSeasonStats({ summary }: DriverSeasonStatsProps) {
  const { aggregates, rows } = summary;
  const recentFirstRows = [...rows].sort((a, b) => b.round - a.round);

  return (
    <div className="flex flex-col gap-4">
      {/* Aggregates strip */}
      <div className="flex flex-wrap gap-2">
        <StatBox label="Races" value={aggregates.races} />
        <StatBox label="Wins" value={aggregates.wins} />
        <StatBox label="Podiums" value={aggregates.podiums} />
        <StatBox label="Points" value={aggregates.points} />
        <StatBox label="DNFs" value={aggregates.dnfs} />
        <StatBox label="Fastest" value={aggregates.fastestLaps} />
        <StatBox label="Avg Finish" value={aggregates.avgFinish} />
        <StatBox label="Avg Grid" value={aggregates.avgGrid} />
      </div>

      {/* Race-by-race table (recent first, 5-row viewport with vertical scroll) */}
      <div className="text-[11px] text-muted-foreground">Recent races first. Scroll for full season history.</div>
      <div className="max-h-[250px] overflow-y-scroll rounded-lg border border-border/70 pr-1 scrollbar-visible">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-right pr-2">#</TableHead>
              <TableHead>Race</TableHead>
              <TableHead className="text-right">Grid</TableHead>
              <TableHead className="text-right">Finish</TableHead>
              <TableHead className="text-right">Pts</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentFirstRows.map((row) => (
              <TableRow key={row.round}>
                <TableCell className="text-right pr-2 text-muted-foreground">{row.round}</TableCell>
                <TableCell className="font-medium">
                  {row.raceName.replace(" Grand Prix", " GP")}
                </TableCell>
                <TableCell className="text-right">{row.grid || "PL"}</TableCell>
                <TableCell className="text-right">{row.finish <= 20 ? row.finish : "–"}</TableCell>
                <TableCell className="text-right tabular-nums">{row.points > 0 ? row.points : "–"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {row.fastestLap && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 border-purple-500/50 text-purple-400">
                        FL
                      </Badge>
                    )}
                    <span className={
                      row.status === "Finished" || row.status.startsWith("+")
                        ? "text-muted-foreground text-xs"
                        : "text-destructive text-xs"
                    }>
                      {row.status === "Finished" ? "✓" : row.status}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
