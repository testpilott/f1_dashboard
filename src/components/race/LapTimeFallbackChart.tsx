"use client";

import { useMemo } from "react";
import { ResponsiveLine, type LineCustomSvgLayerProps } from "@nivo/line";
import { chartColors, nivoTheme } from "@/lib/charts/theme";
import type { LapSeriesPoint, PitstopMarker } from "@/lib/stats/lapAnalysis";

type ChartSeries = {
  id: string;
  color: string;
  data: { x: number; y: number }[];
};

function fmtLap(ms: number): string {
  const sec = ms / 1000;
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(3).padStart(6, "0");
  return `${m}:${s}`;
}

export default function LapTimeFallbackChart({
  series,
  pitstops,
}: {
  series: LapSeriesPoint[];
  pitstops: PitstopMarker[];
}) {
  const colors = chartColors();

  const data = useMemo<ChartSeries[]>(() => {
    const grouped = new Map<string, { x: number; y: number }[]>();
    for (const p of series) {
      const arr = grouped.get(p.driverId) ?? [];
      arr.push({ x: p.lap, y: p.ms });
      grouped.set(p.driverId, arr);
    }

    return Array.from(grouped.entries()).map(([id, values], i) => ({
      id,
      color: colors[i % colors.length],
      data: values.sort((a, b) => Number(a.x) - Number(b.x)),
    }));
  }, [series, colors]);

  const pitLaps = useMemo(
    () => Array.from(new Set(pitstops.map((p) => p.lap))).sort((a, b) => a - b),
    [pitstops],
  );

  if (!data.length) {
    return <p className="text-muted-foreground text-sm">No fallback lap data available.</p>;
  }

  const pitLayer = (props: LineCustomSvgLayerProps<ChartSeries>) => {
    const xScale = props.xScale as unknown as (v: number) => number;

    return (
      <g>
        {pitLaps.map((lap) => {
          const x = xScale(lap);
          if (Number.isNaN(x)) return null;
          return (
            <line
              key={`pit-${lap}`}
              x1={x}
              y1={0}
              x2={x}
              y2={props.innerHeight}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              opacity={0.35}
            />
          );
        })}
      </g>
    );
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Fallback lap chart (Jolpica) with pit-stop markers.
      </p>
      <div className="h-72 w-full">
        <ResponsiveLine<ChartSeries>
          data={data}
          theme={nivoTheme()}
          colors={{ datum: "color" }}
          margin={{ top: 8, right: 16, bottom: 44, left: 58 }}
          xScale={{ type: "linear", min: 1, max: "auto" }}
          yScale={{ type: "linear", min: "auto", max: "auto", nice: true }}
          axisBottom={{
            legend: "Lap",
            legendOffset: 36,
            legendPosition: "middle",
            tickSize: 0,
            tickPadding: 6,
          }}
          axisLeft={{ tickSize: 0, tickPadding: 6, format: (v) => fmtLap(Number(v)) }}
          lineWidth={1.6}
          enablePoints={false}
          useMesh={true}
          enableSlices="x"
          layers={[
            "grid",
            "markers",
            "axes",
            pitLayer,
            "lines",
            "points",
            "slices",
            "mesh",
            "legends",
          ]}
        />
      </div>
    </div>
  );
}
