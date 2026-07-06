"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { parseISO, isPast } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import CircuitThumb from "@/components/schedule/CircuitThumb";
import SessionRow, { type SessionEntry } from "@/components/schedule/SessionRow";
import RaceResultPanel from "@/components/schedule/RaceResultPanel";
import { getFlag, getCircuitImageUrl, CIRCUIT_COORDS } from "@/lib/constants";
import { hasRaceFinished } from "@/lib/time/raceFinished";
import type { Race } from "@/lib/types";
import { cn } from "@/lib/utils";

const _noopSubscribe = () => () => {};

function buildSessions(race: Race): SessionEntry[] {
  const sessions: SessionEntry[] = [];
  if (race.FirstPractice) sessions.push({ label: "Practice 1", ...race.FirstPractice });
  if (race.SecondPractice) sessions.push({ label: "Practice 2", ...race.SecondPractice });
  if (race.SprintQualifying) sessions.push({ label: "Sprint Qualifying", ...race.SprintQualifying });
  if (race.ThirdPractice) sessions.push({ label: "Practice 3", ...race.ThirdPractice });
  if (race.Qualifying) sessions.push({ label: "Qualifying", ...race.Qualifying });
  if (race.Sprint) sessions.push({ label: "Sprint Race", ...race.Sprint });
  sessions.push({ label: "Race", date: race.date, time: race.time });
  return sessions;
}

export default function ScheduleRow({ race }: { race: Race }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const userTz = useSyncExternalStore(
    _noopSubscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => null
  );

  const raceDate = parseISO(race.date);
  const past = isPast(raceDate);
  // Stricter than `past` (which flips at midnight on race day): only swap
  // the timings for the classification once the race has actually run.
  const finished = hasRaceFinished(race.date, race.time ?? null, Date.now());
  const isSprint = Boolean(race.Sprint);
  const circuitImgUrl = getCircuitImageUrl(race.Circuit.circuitId);
  const circuitTz = CIRCUIT_COORDS[race.Circuit.Location.country]?.timezone ?? "UTC";
  const sessions = buildSessions(race);

  return (
    <div
      className={cn(
        "rounded-lg border transition-all",
        past
          ? "border-border bg-surface-2/50 opacity-60 hover:opacity-80"
          : "border-border bg-gradient-to-r from-surface-2 to-background",
        isExpanded && "opacity-100 border-primary/30 shadow-sm"
      )}
    >
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-accent/30 rounded-lg transition-colors text-left"
        aria-expanded={isExpanded}
      >
        <span className="font-mono text-sm text-muted-foreground w-6 shrink-0 tabular-nums">
          {race.round}
        </span>
        {circuitImgUrl ? (
          <CircuitThumb url={circuitImgUrl} country={race.Circuit.Location.country} />
        ) : (
          <div className="w-14 h-14 shrink-0" />
        )}
        <span className="text-xl shrink-0">{getFlag(race.Circuit.Location.country)}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{race.raceName}</p>
          <p className="text-xs text-muted-foreground truncate">
            {race.Circuit.circuitName} · {race.Circuit.Location.locality}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isSprint && (
            <Badge className="bg-accent-2/20 text-accent-2 border-accent-2/40 text-xs px-1.5">
              Sprint
            </Badge>
          )}
          {past && (
            <Badge variant="outline" className="border-border text-muted-foreground text-xs px-1.5">
              Done
            </Badge>
          )}
          <span className="text-sm text-muted-foreground tabular-nums">
            {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(raceDate)}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="border-t border-border/40 pt-1">
            {finished ? (
              <RaceResultPanel season={race.season} round={race.round} />
            ) : (
              sessions.map((s) => (
                <SessionRow
                  key={s.label}
                  session={s}
                  circuitTz={circuitTz}
                  userTz={userTz}
                />
              ))
            )}
            <div className="mt-4">
              <Link
                href={`/race/${race.season}/${race.round}`}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline underline-offset-4"
              >
                {finished ? "Full race detail" : past ? "View results" : "Race detail"} →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
