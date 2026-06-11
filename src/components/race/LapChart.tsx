"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { OpenF1Lap, OpenF1Driver } from "@/lib/types";
import { fetchJson } from "@/lib/api/clientFetch";
import { getTeamColor } from "@/lib/constants";
import { nivoTheme } from "@/lib/charts/theme";
import { ResponsiveLine } from "@nivo/line";
import { Skeleton } from "@/components/ui/skeleton";

async function fetchLaps(sessionKey: number) {
  const d = await fetchJson<{ laps?: OpenF1Lap[] }>(`/api/sessions/laps?session_key=${sessionKey}`);
  return (Array.isArray(d.laps) ? d.laps : []) as OpenF1Lap[];
}

async function fetchDrivers(sessionKey: number) {
  const d = await fetchJson<{ drivers?: OpenF1Driver[] }>(`/api/sessions/drivers?session_key=${sessionKey}`);
  return (Array.isArray(d.drivers) ? d.drivers : []) as OpenF1Driver[];
}

function lapTimeToSeconds(ms: number | null | undefined): number | null {
  if (ms == null || ms <= 0) return null;
  return ms / 1000;
}

export default function LapChart({ sessionKey }: { sessionKey: number }) {
  const { data: laps, isLoading: lapsLoading } = useQuery({
    queryKey: ["laps", sessionKey],
    queryFn: () => fetchLaps(sessionKey),
    staleTime: 10 * 60 * 1000,
  });
  const { data: drivers } = useQuery({
    queryKey: ["session-drivers", sessionKey],
    queryFn: () => fetchDrivers(sessionKey),
    staleTime: 30 * 60 * 1000,
  });

  // Build Nivo-format series data and filter outliers.
  // NOTE: hooks must run unconditionally — keep this above the early returns.
  const nivoData = useMemo(() => {
    const safeLaps = laps ?? [];
    if (safeLaps.length === 0) return [];
    const driverMap = new Map(drivers?.map((d) => [d.driver_number, d]) ?? []);
    const driverNumbers = [...new Set(safeLaps.map((l) => l.driver_number))];

    // Pre-index laps for O(1) lookup
    const lapIndex = new Map<string, OpenF1Lap>();
    for (const l of safeLaps) lapIndex.set(`${l.lap_number}:${l.driver_number}`, l);
    const maxLap = Math.max(...safeLaps.map((l) => l.lap_number));

    return driverNumbers.map((dNum) => {
      const d = driverMap.get(dNum);
      const code = d?.name_acronym ?? `#${dNum}`;
      const color = getTeamColor(d?.team_name ?? "");

      // Collect raw lap times
      const points = Array.from({ length: maxLap }, (_, i) => {
        const lapEntry = lapIndex.get(`${i + 1}:${dNum}`);
        return { lap: i + 1, time: lapTimeToSeconds(lapEntry?.lap_duration) };
      });

      // Filter outliers: remove laps > 1.5× driver median
      const validTimes = points.map((p) => p.time).filter((t): t is number => t != null);
      validTimes.sort((a, b) => a - b);
      const median = validTimes[Math.floor(validTimes.length / 2)] ?? 0;

      return {
        id: code,
        color,
        data: points
          .filter((p) => p.time != null && p.time <= median * 1.5)
          .map((p) => ({ x: p.lap, y: p.time as number })),
      };
    });
  }, [laps, drivers]);

  if (lapsLoading) return <Skeleton className="h-72 w-full" />;
  if (!laps?.length) return <p className="text-muted-foreground text-sm">No lap data available.</p>;

  const theme = nivoTheme();

  return (
    <div className="w-full h-72">
      <ResponsiveLine
        data={nivoData}
        theme={theme}
        colors={{ datum: "color" }}
        margin={{ top: 8, right: 24, bottom: 48, left: 44 }}
        xScale={{ type: "linear", min: 1, max: "auto" }}
        yScale={{ type: "linear", min: "auto", max: "auto", nice: true }}
        axisBottom={{
          legend: "Lap",
          legendOffset: 38,
          legendPosition: "middle",
          tickSize: 0,
          tickPadding: 6,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 6,
          format: (v) => `${Number(v).toFixed(0)}s`,
        }}
        lineWidth={1.5}
        enablePoints={false}
        useMesh={true}
        enableSlices="x"
        enableCrosshair={true}
        sliceTooltip={({ slice }) => (
          <div className="bg-surface-2 border border-border rounded-lg p-3 text-xs shadow-lg">
            <p className="font-semibold mb-1 text-foreground/80">Lap {slice.id}</p>
            {[...slice.points]
              .sort((a, b) => (a.data.y as number) - (b.data.y as number))
              .map((point) => (
                <div key={point.id} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: point.color }} />
                  <span className="text-muted-foreground">{point.seriesId}</span>
                  <span className="font-mono ml-auto tabular-nums">{(point.data.y as number).toFixed(3)}s</span>
                </div>
              ))}
          </div>
        )}
        legends={[
          {
            anchor: "bottom",
            direction: "row",
            justify: false,
            translateX: 0,
            translateY: 44,
            itemWidth: 56,
            itemHeight: 12,
            itemsSpacing: 4,
            symbolSize: 8,
            symbolShape: "circle",
          },
        ]}
      />
    </div>
  );
}

