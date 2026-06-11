"use client";

import { useState } from "react";
import { buildUTCDate, formatInTz } from "@/lib/time/format";
import { cn } from "@/lib/utils";
import Countdown from "@/components/schedule/Countdown";

export type SessionEntry = { label: string; date: string; time?: string };

export default function SessionRow({
  session,
  circuitTz,
  userTz,
}: {
  session: SessionEntry;
  circuitTz: string;
  userTz: string | null;
}) {
  const dt = buildUTCDate(session.date, session.time);
  // Capture "now" once at mount so render stays pure (react-hooks/purity).
  const [now] = useState(() => Date.now());
  const isSessionPast = dt.getTime() < now;
  const sameZone = userTz === circuitTz;
  const isRace = session.label === "Race";

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-0 py-2.5 border-b border-border/30 last:border-0">
      <span
        className={cn(
          "text-xs font-medium w-32 shrink-0 pt-0.5",
          isRace ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {session.label}
      </span>

      <div className="flex flex-col gap-1 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wide w-16 shrink-0">
            Circuit
          </span>
          <span className="font-mono text-xs tabular-nums">{formatInTz(dt, circuitTz)}</span>
        </div>

        {userTz && !sameZone && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wide w-16 shrink-0">
              Your time
            </span>
            <span className="font-mono text-xs tabular-nums">{formatInTz(dt, userTz)}</span>
          </div>
        )}

        {!isSessionPast && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wide w-16 shrink-0">
              In
            </span>
            <Countdown target={dt} />
          </div>
        )}
      </div>
    </div>
  );
}
