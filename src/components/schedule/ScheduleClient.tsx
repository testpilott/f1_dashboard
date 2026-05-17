"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { parseISO, isPast } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import CircuitThumb from "@/components/schedule/CircuitThumb";
import { getFlag, getCircuitImageUrl, CIRCUIT_COORDS } from "@/lib/constants";
import type { Race } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function buildUTCDate(date: string, time?: string): Date {
  if (!time) return new Date(`${date}T12:00:00Z`);
  const t = time.endsWith("Z") ? time : `${time}Z`;
  return new Date(`${date}T${t}`);
}

function formatInTz(date: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZoneName: "shortOffset",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }
}

function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

// ─── Countdown component (client-only, avoids hydration mismatch) ─────────────

function Countdown({ target }: { target: Date }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const calc = () => target.getTime() - Date.now();
    setRemaining(calc());
    const interval = setInterval(() => {
      const r = calc();
      setRemaining(r);
      if (r <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [target]);

  if (remaining === null) return null;
  if (remaining <= 0) return <span className="text-primary font-mono text-xs">Starting…</span>;
  return (
    <span className="text-primary font-mono text-xs tabular-nums">
      {formatCountdown(remaining)}
    </span>
  );
}

// ─── Session list helpers ─────────────────────────────────────────────────────

type SessionEntry = { label: string; date: string; time?: string };

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

// ─── Session row ─────────────────────────────────────────────────────────────

function SessionRow({
  session,
  circuitTz,
  userTz,
}: {
  session: SessionEntry;
  circuitTz: string;
  userTz: string | null;
}) {
  const dt = buildUTCDate(session.date, session.time);
  const isSessionPast = dt.getTime() < Date.now();
  const sameZone = userTz === circuitTz;
  const isRace = session.label === "Race";

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-0 py-2.5 border-b border-border/30 last:border-0">
      {/* Label */}
      <span
        className={cn(
          "text-xs font-medium w-32 shrink-0 pt-0.5",
          isRace ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {session.label}
      </span>

      {/* Times + countdown */}
      <div className="flex flex-col gap-1 flex-1">
        {/* Circuit local time */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wide w-16 shrink-0">
            Circuit
          </span>
          <span className="font-mono text-xs tabular-nums">{formatInTz(dt, circuitTz)}</span>
        </div>

        {/* User's local time (only when different timezone and known) */}
        {userTz && !sameZone && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wide w-16 shrink-0">
              Your time
            </span>
            <span className="font-mono text-xs tabular-nums">{formatInTz(dt, userTz)}</span>
          </div>
        )}

        {/* Countdown for future sessions */}
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

// ─── Race row ─────────────────────────────────────────────────────────────────

function ScheduleRow({ race }: { race: Race }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [userTz, setUserTz] = useState<string | null>(null);

  useEffect(() => {
    setUserTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  const raceDate = parseISO(race.date);
  const past = isPast(raceDate);
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
      {/* Clickable header row */}
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
            {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(raceDate)}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
        </div>
      </button>

      {/* Expanded session panel */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="border-t border-border/40 pt-1">
            {sessions.map((s) => (
              <SessionRow
                key={s.label}
                session={s}
                circuitTz={circuitTz}
                userTz={userTz}
              />
            ))}
            <div className="mt-4">
              <Link
                href={`/race/${race.season}/${race.round}`}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline underline-offset-4"
              >
                {past ? "View results" : "Race detail"} →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ScheduleClient({ races }: { races: Race[] }) {
  return (
    <div className="space-y-2">
      {races.map((race) => (
        <ScheduleRow key={race.round} race={race} />
      ))}
    </div>
  );
}
