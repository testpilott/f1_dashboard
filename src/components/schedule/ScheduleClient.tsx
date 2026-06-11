"use client";

import { parseISO, isPast } from "date-fns";
import { CalendarPlus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import ScheduleRow from "@/components/schedule/ScheduleRow";
import type { Race } from "@/lib/types";
// ─── Main export ──────────────────────────────────────────────────────────────

export default function ScheduleClient({ races }: { races: Race[] }) {
  const season = races[0]?.season ?? "current";
  const splitIndex = races.findIndex((r) => !isPast(parseISO(r.date)));
  const pastRaces = splitIndex === -1 ? races : races.slice(0, splitIndex);
  const upcomingRaces = splitIndex === -1 ? [] : races.slice(splitIndex);

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <a
          href={`/api/schedule/export?season=${season}`}
          download={`f1-${season}.ics`}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline underline-offset-4"
        >
          <CalendarPlus className="w-4 h-4" aria-hidden="true" />
          Add season to calendar
        </a>
      </div>

      {/* Past races section */}
      {pastRaces.length > 0 && (
        <section aria-label="Past races">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mt-4 mb-1 px-1">
            Past Races
          </p>
          <div className="space-y-2">
            {pastRaces.map((race) => (
              <ScheduleRow key={race.round} race={race} />
            ))}
          </div>
        </section>
      )}

      {/* Divider — only shown when both sections are non-empty */}
      {pastRaces.length > 0 && upcomingRaces.length > 0 && (
        <Separator className="my-2" />
      )}

      {/* Upcoming races section */}
      {upcomingRaces.length > 0 && (
        <section aria-label="Upcoming races">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mt-4 mb-1 px-1">
            Upcoming Races
          </p>
          <div className="space-y-2">
            {upcomingRaces.map((race) => (
              <ScheduleRow key={race.round} race={race} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
