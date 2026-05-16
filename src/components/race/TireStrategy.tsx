"use client";

import { useQuery } from "@tanstack/react-query";
import type { OpenF1Stint, OpenF1Driver } from "@/lib/types";
import { TYRE_COLORS } from "@/lib/constants";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

async function fetchStints(sessionKey: number) {
  const res = await fetch(`/api/sessions?endpoint=stints&session_key=${sessionKey}`);
  if (!res.ok) throw new Error("Failed");
  return res.json().then((d) => (Array.isArray(d.stints) ? d.stints : []) as OpenF1Stint[]);
}

async function fetchDrivers(sessionKey: number) {
  const res = await fetch(`/api/sessions?endpoint=drivers&session_key=${sessionKey}`);
  if (!res.ok) throw new Error("Failed");
  return res.json().then((d) => (Array.isArray(d.drivers) ? d.drivers : []) as OpenF1Driver[]);
}

export default function TireStrategy({ sessionKey }: { sessionKey: number }) {
  const { data: stints, isLoading } = useQuery({
    queryKey: ["stints", sessionKey],
    queryFn: () => fetchStints(sessionKey),
    staleTime: 10 * 60 * 1000,
  });
  const { data: drivers } = useQuery({
    queryKey: ["session-drivers", sessionKey],
    queryFn: () => fetchDrivers(sessionKey),
    staleTime: 30 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-64 w-full bg-zinc-800" />;
  if (!stints?.length) return <p className="text-zinc-500 text-sm">No stint data available.</p>;

  const driverMap = new Map(drivers?.map((d) => [d.driver_number, d]) ?? []);

  // Group stints by driver
  const driverNumbers = [...new Set(stints.map((s) => s.driver_number))];
  const maxLap = Math.max(...stints.map((s) => s.lap_end ?? s.lap_start ?? 0));

  // Sort drivers by their final position (last stint's lap_end desc = most laps = better)
  driverNumbers.sort((a, b) => {
    const lastA = Math.max(
      ...stints.filter((s) => s.driver_number === a).map((s) => s.lap_end ?? 0)
    );
    const lastB = Math.max(
      ...stints.filter((s) => s.driver_number === b).map((s) => s.lap_end ?? 0)
    );
    return lastB - lastA;
  });

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Legend */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          {(["SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET"] as const).map((c) => (
            <div key={c} className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ backgroundColor: TYRE_COLORS[c] }}
              />
              {c.charAt(0) + c.slice(1).toLowerCase()}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="space-y-1">
          {driverNumbers.map((dNum) => {
            const driver = driverMap.get(dNum);
            const code = driver?.name_acronym ?? `#${dNum}`;
            const driverStints = stints.filter((s) => s.driver_number === dNum);

            return (
              <div key={dNum} className="flex items-center gap-2">
                <span className="w-8 text-xs font-mono text-zinc-500 shrink-0 text-right">
                  {code}
                </span>
                {/* Bar track */}
                <div
                  className="relative h-6 flex-1 rounded overflow-hidden bg-zinc-800"
                  style={{ minWidth: 0 }}
                >
                  {driverStints.map((stint, idx) => {
                    const start = ((stint.lap_start ?? 1) - 1) / maxLap * 100;
                    const end = ((stint.lap_end ?? stint.lap_start ?? 1)) / maxLap * 100;
                    const width = end - start;
                    const compound = stint.compound ?? "UNKNOWN";
                    const color = TYRE_COLORS[compound as keyof typeof TYRE_COLORS] ?? "#666";

                    return (
                      <Tooltip key={idx}>
                        <TooltipTrigger>
                          <div
                            className="absolute top-0 bottom-0 cursor-pointer hover:brightness-125 transition-all"
                            style={{
                              left: `${start}%`,
                              width: `calc(${width}% - 1px)`,
                              backgroundColor: color,
                              borderRight: "1px solid #18181b",
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-zinc-900 border-zinc-700 text-xs">
                          <p className="font-semibold">{compound}</p>
                          <p className="text-zinc-400">
                            Laps {stint.lap_start}–{stint.lap_end}
                            {stint.tyre_age_at_start != null && (
                              <span className="ml-1">({stint.tyre_age_at_start} laps old)</span>
                            )}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Lap number axis */}
        <div className="flex ml-10 mt-1">
          {Array.from({ length: Math.min(maxLap, 10) }).map((_, i) => {
            const lap = Math.round(((i + 1) / 10) * maxLap);
            return (
              <div
                key={i}
                className="flex-1 text-center text-[9px] text-zinc-600"
                style={{ marginLeft: i === 0 ? 0 : undefined }}
              >
                {lap}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
