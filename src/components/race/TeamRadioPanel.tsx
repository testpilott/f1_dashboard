"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Radio, ChevronDown, ChevronUp } from "lucide-react";
import { fetchJson } from "@/lib/api/clientFetch";
import { Skeleton } from "@/components/ui/skeleton";
import { getTeamColor } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface RadioClip { date: string; recording_url: string }
interface DriverRadio {
  driverNumber: number;
  acronym: string;
  team: string;
  colour: string;
  clips: RadioClip[];
}

async function fetchRadio(year: string, round: string): Promise<{ available: boolean; reason?: string; sessionName?: string; items?: DriverRadio[] }> {
  return fetchJson<{ available: boolean; reason?: string; sessionName?: string; items?: DriverRadio[] }>(`/api/team-radio?year=${year}&round=${round}`);
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch { return iso; }
}

function DriverRow({ driver }: { driver: DriverRadio }) {
  const [expanded, setExpanded] = useState(false);
  const color = driver.colour ? `#${driver.colour}` : getTeamColor(driver.team);
  const shown = expanded ? driver.clips : driver.clips.slice(-3);

  return (
    <div className="rounded-lg border border-border bg-surface-2/50 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors text-left"
        aria-expanded={expanded}
      >
        <Radio className="w-4 h-4 shrink-0" style={{ color }} aria-hidden="true" />
        <span className="font-mono text-sm font-bold" style={{ color }}>{driver.acronym}</span>
        <span className="text-xs text-muted-foreground flex-1 truncate">{driver.team}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{driver.clips.length} clip{driver.clips.length !== 1 ? "s" : ""}</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {(expanded || driver.clips.length <= 3) && (
        <div className="px-4 pb-3 space-y-2 border-t border-border/40 pt-2">
          {shown.map((clip, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-[10px] text-muted-foreground/60 font-mono tabular-nums w-16 shrink-0">{formatTime(clip.date)}</span>
              <audio
                controls
                preload="none"
                src={clip.recording_url}
                className={cn(
                  "flex-1 h-7",
                  "accent-primary"
                )}
                aria-label={`Team radio clip at ${formatTime(clip.date)}`}
              />
            </div>
          ))}
          {!expanded && driver.clips.length > 3 && (
            <button onClick={() => setExpanded(true)} className="text-xs text-primary hover:underline">
              Show all {driver.clips.length} clips
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function TeamRadioPanel({ year, round }: { year: string; round: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["team-radio", year, round],
    queryFn: () => fetchRadio(year, round),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3 mt-4">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
      </div>
    );
  }

  if (isError) {
    return <p className="text-muted-foreground text-sm mt-4">Failed to load team radio.</p>;
  }

  if (!data?.available || !data.items?.length) {
    return (
      <div className="mt-4 py-8 text-center text-muted-foreground">
        <Radio className="w-8 h-8 mx-auto mb-3 opacity-40" />
        <p className="text-sm">{data?.reason ?? "No team radio clips available for this session."}</p>
      </div>
    );
  }

  const items = data.items!;
  const totalClips = items.reduce((s, d) => s + d.clips.length, 0);

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{data.sessionName ?? "Race"}</span> session ·{" "}
        {totalClips} clip{totalClips !== 1 ? "s" : ""} across {items.length} driver{items.length !== 1 ? "s" : ""}
      </p>
      {items.map((driver) => (
        <DriverRow key={driver.driverNumber} driver={driver} />
      ))}
    </div>
  );
}
