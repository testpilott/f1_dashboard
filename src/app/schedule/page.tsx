import type { Race } from "@/lib/types";
import { getSchedule } from "@/lib/api/jolpica";
import { format, parseISO, isPast } from "date-fns";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getFlag } from "@/lib/constants";
import { getCircuitImageUrl } from "@/lib/constants";
import CircuitThumb from "@/components/schedule/CircuitThumb";

export default async function SchedulePage() {
  const races = await getSchedule();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">2026 Race Calendar</h1>

      {!races.length ? (
        <p className="text-muted-foreground">No schedule data available.</p>
      ) : (
        <div className="space-y-2">
          {races.map((race: Race) => {
            const raceDate = parseISO(race.date);
            const past = isPast(raceDate);
            const isSprint = Boolean(race.Sprint);
            const circuitImgUrl = getCircuitImageUrl(race.Circuit.circuitId);

            return (
              <Link
                key={race.round}
                href={`/race/${race.season}/${race.round}`}
                className={`flex items-center gap-4 px-4 py-3 rounded-lg border transition-all hover:scale-[1.01] hover:shadow-md ${
                  past
                    ? "border-border bg-surface-2/50 opacity-60 hover:opacity-80"
                    : "border-border bg-gradient-to-r from-surface-2 to-background hover:bg-accent hover:border-border/60"
                }`}
              >
                <span className="font-mono text-sm text-muted-foreground w-6 shrink-0 tabular-nums">
                  {race.round}
                </span>
                {circuitImgUrl ? (
                  <CircuitThumb url={circuitImgUrl} country={race.Circuit.Location.country} />
                ) : (
                  <div className="w-14 h-14 shrink-0" />
                )}
                <span className="text-xl shrink-0">
                  {getFlag(race.Circuit.Location.country)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{race.raceName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {race.Circuit.circuitName} · {race.Circuit.Location.locality}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isSprint && (
                    <Badge className="bg-purple-800/60 text-purple-300 border-purple-800 text-xs px-1.5">
                      Sprint
                    </Badge>
                  )}
                  {past && (
                    <Badge variant="outline" className="border-border text-muted-foreground text-xs px-1.5">
                      Done
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {format(raceDate, "d MMM")}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
