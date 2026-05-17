"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { OpenF1Lap, OpenF1Driver } from "@/lib/types";
import { getTeamColor } from "@/lib/constants";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

async function fetchLaps(sessionKey: number) {
  const res = await fetch(`/api/sessions?endpoint=laps&session_key=${sessionKey}`);
  if (!res.ok) throw new Error("Failed");
  return res.json().then((d) => (Array.isArray(d.laps) ? d.laps : []) as OpenF1Lap[]);
}

async function fetchDrivers(sessionKey: number) {
  const res = await fetch(`/api/sessions?endpoint=drivers&session_key=${sessionKey}`);
  if (!res.ok) throw new Error("Failed");
  return res.json().then((d) => (Array.isArray(d.drivers) ? d.drivers : []) as OpenF1Driver[]);
}

function lapTimeToSeconds(ms: number | null | undefined): number | null {
  if (ms == null || ms <= 0) return null;
  return ms / 1000;
}

interface ChartPoint {
  lap: number;
  [driverCode: string]: number | null;
}

// Custom tooltip
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-xs shadow-lg">
      <p className="font-semibold mb-1 text-zinc-300">Lap {label}</p>
      {payload
        .filter((p) => p.value != null)
        .sort((a, b) => a.value - b.value)
        .map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
            <span className="text-zinc-400">{p.name}</span>
            <span className="font-mono ml-auto">{p.value.toFixed(3)}s</span>
          </div>
        ))}
    </div>
  );
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

  if (lapsLoading) return <Skeleton className="h-72 w-full bg-zinc-800" />;
  if (!laps?.length) return <p className="text-zinc-500 text-sm">No lap data available.</p>;

  // Build chart data and filter outliers — memoized to avoid O(n²) work on every render.
  const { lapData, driverNumbers, driverMap } = useMemo(() => {
    const map = new Map(drivers?.map((d) => [d.driver_number, d]) ?? []);
    const dNums = [...new Set(laps.map((l) => l.driver_number))];
    const maxLap = Math.max(...laps.map((l) => l.lap_number));

    // Pre-index for O(1) lookup instead of O(N) laps.find() inside the double loop.
    const lapIndex = new Map<string, OpenF1Lap>();
    for (const l of laps) lapIndex.set(`${l.lap_number}:${l.driver_number}`, l);

    // Build chart data
    const data: ChartPoint[] = [];
    for (let lap = 1; lap <= maxLap; lap++) {
      const point: ChartPoint = { lap };
      for (const dNum of dNums) {
        const lapEntry = lapIndex.get(`${lap}:${dNum}`);
        const d = map.get(dNum);
        const code = d?.name_acronym ?? `#${dNum}`;
        point[code] = lapTimeToSeconds(lapEntry?.lap_duration);
      }
      data.push(point);
    }

    // Filter outlier lap times per driver (remove anything > 1.5× the driver median)
    const codes = dNums.map((n) => map.get(n)?.name_acronym ?? `#${n}`);
    for (const code of codes) {
      const times = data.map((p) => p[code]).filter((v): v is number => v != null);
      if (!times.length) continue;
      times.sort((a, b) => a - b);
      const median = times[Math.floor(times.length / 2)];
      data.forEach((p) => {
        const v = p[code];
        if (v != null && v > median * 1.5) p[code] = null;
      });
    }

    return { lapData: data, driverNumbers: dNums, driverMap: map };
  }, [laps, drivers]);

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={lapData} margin={{ top: 4, right: 8, left: -8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="lap" tick={{ fill: "#71717a", fontSize: 11 }} label={{ value: "Lap", position: "insideBottom", offset: -2, fill: "#71717a", fontSize: 11 }} />
          <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(0)}s`} width={40} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
            formatter={(value) => <span style={{ color: "#a1a1aa" }}>{value}</span>}
          />
          {driverNumbers.map((dNum) => {
            const d = driverMap.get(dNum);
            const code = d?.name_acronym ?? `#${dNum}`;
            const color = getTeamColor(d?.team_name ?? "");
            return (
              <Line
                key={dNum}
                type="monotone"
                dataKey={code}
                stroke={color}
                strokeWidth={1.5}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
