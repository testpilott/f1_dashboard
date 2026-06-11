import type { QualifyingResult, RaceResult } from "@/lib/types";
import { getStatusLabel, getStatusTooltip } from "@/lib/constants";
import TeamLogo from "@/components/ui/TeamLogo";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ResultData = RaceResult[] | QualifyingResult[];

export default function ResultTable({
  type,
  title,
  initialData,
}: {
  type: "race" | "qualifying" | "sprint";
  title: string;
  initialData?: ResultData;
}) {
  const data = initialData;

  if (!data || !Array.isArray(data) || data.length === 0) {
    return <p className="text-muted-foreground text-sm mt-4">No {title.toLowerCase()} available.</p>;
  }

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <Table className="mt-2">
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground w-12">Pos</TableHead>
            <TableHead className="text-muted-foreground">Driver</TableHead>
            {type === "qualifying" ? (
              <>
                <TableHead className="text-muted-foreground text-right">Q1</TableHead>
                <TableHead className="text-muted-foreground text-right">Q2</TableHead>
                <TableHead className="text-muted-foreground text-right">Q3</TableHead>
              </>
            ) : (
              <>
                <TableHead className="text-muted-foreground hidden sm:table-cell">Constructor</TableHead>
                <TableHead className="text-muted-foreground text-right">Time / Status</TableHead>
                <TableHead className="text-muted-foreground text-right w-12">Pts</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {type === "qualifying"
            ? (data as QualifyingResult[]).map((r) => (
              <TableRow key={r.Driver.driverId} className="border-border hover:bg-accent/40">
                <TableCell className="py-2 font-mono text-sm tabular-nums">{r.position}</TableCell>
                <TableCell className="py-2">
                  <div className="flex items-center gap-2">
                    <TeamLogo team={r.Constructor?.name ?? ""} />
                    <span className="font-mono text-xs text-muted-foreground w-8 tabular-nums">{r.Driver.code}</span>
                    <span className="text-sm">
                      {r.Driver.givenName} {r.Driver.familyName}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-2 text-right font-mono text-xs text-muted-foreground tabular-nums">{r.Q1 ?? "–"}</TableCell>
                <TableCell className="py-2 text-right font-mono text-xs text-muted-foreground tabular-nums">{r.Q2 ?? "–"}</TableCell>
                <TableCell className="py-2 text-right font-mono text-xs tabular-nums">{r.Q3 ?? "–"}</TableCell>
              </TableRow>
            ))
            : (data as RaceResult[]).map((r) => (
              <TableRow key={r.Driver.driverId} className="border-border hover:bg-accent/40">
                <TableCell className="py-2 font-mono text-sm tabular-nums">
                  {r.positionText && /^[A-Z]$/.test(r.positionText) && r.positionText !== "1" ? (
                    <Tooltip>
                      <TooltipTrigger render={<Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs px-1.5 cursor-help" />}>
                        {getStatusLabel(r.positionText)}
                      </TooltipTrigger>
                      <TooltipContent>{getStatusTooltip(r.positionText)}</TooltipContent>
                    </Tooltip>
                  ) : (
                    r.position
                  )}
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex items-center gap-2">
                    <TeamLogo team={r.Constructor?.name ?? ""} />
                    <span className="font-mono text-xs text-muted-foreground w-8 shrink-0 tabular-nums">{r.Driver.code}</span>
                    <span className="text-sm">
                      {r.Driver.givenName} {r.Driver.familyName}
                    </span>
                    {r.FastestLap?.rank === "1" && (
                      <Badge className="bg-accent-2/20 text-accent-2 text-[10px] px-1 py-0">FL</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-2 text-muted-foreground text-sm hidden sm:table-cell">
                  {r.Constructor?.name ?? ""}
                </TableCell>
                <TableCell className="py-2 text-right font-mono text-xs text-muted-foreground tabular-nums">
                  {"Time" in r ? r.Time?.time ?? r.status : "–"}
                </TableCell>
                <TableCell className="py-2 text-right text-sm font-bold">
                  {r.points}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
