"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ─── Sector config ────────────────────────────────────────────────────────────

const SECTORS = [
  {
    id: 1,
    label: "S1",
    color: "#10b981",
    dimColor: "rgba(16,185,129,0.18)",
    textClass: "text-emerald-400",
    ringClass: "ring-emerald-500/60",
    btnActiveClass: "bg-emerald-500/20 border-emerald-500/50 text-emerald-300",
    chipClass: "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25",
  },
  {
    id: 2,
    label: "S2",
    color: "#f59e0b",
    dimColor: "rgba(245,158,11,0.18)",
    textClass: "text-amber-400",
    ringClass: "ring-amber-500/60",
    btnActiveClass: "bg-amber-500/20 border-amber-500/50 text-amber-300",
    chipClass: "bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25",
  },
  {
    id: 3,
    label: "S3",
    color: "#3b82f6",
    dimColor: "rgba(59,130,246,0.18)",
    textClass: "text-blue-400",
    ringClass: "ring-blue-500/60",
    btnActiveClass: "bg-blue-500/20 border-blue-500/50 text-blue-300",
    chipClass: "bg-blue-500/15 border-blue-500/40 text-blue-400 hover:bg-blue-500/25",
  },
] as const;

type SectorId = 1 | 2 | 3;

// ─── Types ────────────────────────────────────────────────────────────────────

interface CircuitCorner {
  number: number;
  x: number;
  y: number;
  length: number;
}

interface CircuitInfoPayload {
  available: boolean;
  reason?: string;
  circuitName?: string;
  country?: string;
  locality?: string;
  corners?: CircuitCorner[];
  trackX?: number[];
  trackY?: number[];
  trackPositionTime?: number[];
  rotation?: number;
}

async function fetchCircuitInfo(year: string, round: string): Promise<CircuitInfoPayload> {
  const res = await fetch(
    `/api/circuit-info?year=${encodeURIComponent(year)}&round=${encodeURIComponent(round)}`,
  );
  if (!res.ok) throw new Error("Failed to load circuit info");
  return res.json() as Promise<CircuitInfoPayload>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSectorId(corner: CircuitCorner, maxLen: number): SectorId {
  const frac = maxLen > 0 ? corner.length / maxLen : 0;
  return frac < 1 / 3 ? 1 : frac < 2 / 3 ? 2 : 3;
}

function buildPolylinePoints(xs: number[], svgYs: number[], from: number, to: number): string {
  return xs
    .slice(from, to + 1)
    .map((x, i) => `${x},${svgYs[from + i]}`)
    .join(" ");
}

function rotatePoint(
  x: number,
  y: number,
  cx: number,
  cy: number,
  rotationDeg: number,
): { x: number; y: number } {
  if (!Number.isFinite(rotationDeg) || Math.abs(rotationDeg) < 0.001) return { x, y };

  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - cx;
  const dy = y - cy;

  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

/** Split the track outline polyline into 3 sector segments by trackPositionTime. */
function splitBySectors(
  xs: number[],
  svgYs: number[],
  times: number[],
): [string, string, string] {
  const n = xs.length;
  if (n < 2) return ["", "", ""];

  let i1: number;
  let i2: number;

  if (times.length === n && times[n - 1] > times[0]) {
    const minT = times[0];
    const range = times[n - 1] - minT;
    const f1 = times.findIndex((t) => t >= minT + range / 3);
    const f2 = times.findIndex((t) => t >= minT + (range * 2) / 3);
    i1 = f1 < 0 ? Math.floor(n / 3) : f1;
    i2 = f2 < 0 ? Math.floor((n * 2) / 3) : f2;
  } else {
    i1 = Math.floor(n / 3);
    i2 = Math.floor((n * 2) / 3);
  }

  return [
    buildPolylinePoints(xs, svgYs, 0, i1),
    buildPolylinePoints(xs, svgYs, i1, i2),
    buildPolylinePoints(xs, svgYs, i2, n - 1),
  ];
}

// ─── SVG track map ────────────────────────────────────────────────────────────

function TrackSVG({
  data,
  selectedCorners,
  sectorMap,
}: {
  data: CircuitInfoPayload;
  selectedCorners: Set<number>;
  sectorMap: Map<number, SectorId>;
}) {
  const xs = data.trackX ?? [];
  const rawYs = data.trackY ?? [];
  if (xs.length < 2 || rawYs.length !== xs.length) return null;

  // Flip y: Multiviewer uses math coords (y up), SVG uses screen coords (y down)
  const svgYs = rawYs.map((y) => -y);

  const baseMinX = Math.min(...xs);
  const baseMaxX = Math.max(...xs);
  const baseMinY = Math.min(...svgYs);
  const baseMaxY = Math.max(...svgYs);
  const cx = (baseMinX + baseMaxX) / 2;
  const cy = (baseMinY + baseMaxY) / 2;

  // Rotation from API is in math-coordinate space; after y-flip, invert sign for SVG space.
  const rotationDeg =
    typeof data.rotation === "number" && Number.isFinite(data.rotation) ? -data.rotation : 0;

  const rotatedTrack = xs.map((x, i) => rotatePoint(x, svgYs[i], cx, cy, rotationDeg));
  const trackXs = rotatedTrack.map((p) => p.x);
  const trackYs = rotatedTrack.map((p) => p.y);

  const minX = Math.min(...trackXs);
  const maxX = Math.max(...trackXs);
  const minY = Math.min(...trackYs);
  const maxY = Math.max(...trackYs);
  const span = Math.max(maxX - minX, maxY - minY);
  const pad = span * 0.07;

  const dotR = span * 0.014;
  const trackW = dotR * 1.0;
  const fontSize = dotR * 1.3;

  const [seg1, seg2, seg3] = splitBySectors(trackXs, trackYs, data.trackPositionTime ?? []);
  const corners = data.corners ?? [];

  return (
    <svg
      viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`}
      className="w-full h-auto"
      style={{ maxHeight: "560px" }}
      aria-label={`${data.circuitName ?? "Circuit"} track map`}
      role="img"
    >
      {/* Sector-coloured track segments */}
      {([seg1, seg2, seg3] as const).map((pts, idx) =>
        pts ? (
          <polyline
            key={idx}
            points={pts}
            fill="none"
            stroke={SECTORS[idx].color}
            strokeWidth={trackW}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.75}
          />
        ) : null,
      )}

      {/* Close the circuit loop (end of S3 → start of S1) */}
      <line
        x1={trackXs[trackXs.length - 1]}
        y1={trackYs[trackYs.length - 1]}
        x2={trackXs[0]}
        y2={trackYs[0]}
        stroke={SECTORS[2].color}
        strokeWidth={trackW}
        strokeLinecap="round"
        opacity={0.75}
      />

      {/* Start / finish marker */}
      <circle cx={trackXs[0]} cy={trackYs[0]} r={dotR * 1.8} fill="white" opacity={0.9} />

      {/* Corner markers — render non-selected first so selected ones appear on top */}
      {corners
        .filter((c) => !selectedCorners.has(c.number))
        .map((c) => {
          const sector = sectorMap.get(c.number) ?? 1;
          const sc = SECTORS[sector - 1];
          const cornerPoint = rotatePoint(c.x, -c.y, cx, cy, rotationDeg);
          return (
            <g key={c.number} transform={`translate(${cornerPoint.x}, ${cornerPoint.y})`}>
              <circle
                r={dotR}
                style={{
                  fill: "var(--surface-3, #1e2130)",
                  stroke: sc.color,
                  strokeWidth: dotR * 0.3,
                  opacity: 0.8,
                }}
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={fontSize}
                fontFamily="var(--font-mono, monospace)"
                fontWeight="600"
                style={{ fill: "var(--muted-foreground, #94a3b8)" }}
              >
                {c.number}
              </text>
            </g>
          );
        })}

      {/* Selected corners rendered on top with highlight */}
      {corners
        .filter((c) => selectedCorners.has(c.number))
        .map((c) => {
          const sector = sectorMap.get(c.number) ?? 1;
          const sc = SECTORS[sector - 1];
          const cornerPoint = rotatePoint(c.x, -c.y, cx, cy, rotationDeg);
          return (
            <g key={c.number} transform={`translate(${cornerPoint.x}, ${cornerPoint.y})`}>
              {/* Outer glow ring */}
              <circle r={dotR * 2.4} fill={sc.dimColor} />
              {/* Main dot */}
              <circle r={dotR * 1.5} fill={sc.color} />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={fontSize * 1.1}
                fontFamily="var(--font-mono, monospace)"
                fontWeight="700"
                fill="white"
              >
                {c.number}
              </text>
            </g>
          );
        })}
    </svg>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

export default function CircuitMap({ year, round }: { year: string; round: string }) {
  const [selectedCorners, setSelectedCorners] = useState<Set<number>>(new Set());

  const { data, isLoading, isError } = useQuery<CircuitInfoPayload>({
    queryKey: ["circuit-info", year, round],
    queryFn: () => fetchCircuitInfo(year, round),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const sectorMap = useMemo<Map<number, SectorId>>(() => {
    const corners = data?.corners ?? [];
    if (corners.length === 0) return new Map();
    const maxLen = Math.max(...corners.map((c) => c.length), 1);
    return new Map(corners.map((c) => [c.number, getSectorId(c, maxLen)]));
  }, [data?.corners]);

  const toggleCorner = (n: number) => {
    setSelectedCorners((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const toggleSector = (sectorId: SectorId) => {
    const inSector = (data?.corners ?? [])
      .filter((c) => (sectorMap.get(c.number) ?? 1) === sectorId)
      .map((c) => c.number);
    setSelectedCorners((prev) => {
      const allOn = inSector.every((n) => prev.has(n));
      const next = new Set(prev);
      if (allOn) inSector.forEach((n) => next.delete(n));
      else inSector.forEach((n) => next.add(n));
      return next;
    });
  };

  if (isLoading) return <Skeleton className="h-[480px] w-full mt-4 rounded-lg" />;

  if (isError || !data?.available) {
    return (
      <p className="text-muted-foreground text-sm mt-4">
        {data?.reason ?? "Circuit map unavailable."}
      </p>
    );
  }

  const corners = data.corners ?? [];

  const sectorGroups = SECTORS.map((s) => ({
    ...s,
    corners: corners.filter((c) => (sectorMap.get(c.number) ?? 1) === s.id),
    allSelected:
      corners
        .filter((c) => (sectorMap.get(c.number) ?? 1) === s.id)
        .every((c) => selectedCorners.has(c.number)) &&
      corners.filter((c) => (sectorMap.get(c.number) ?? 1) === s.id).length > 0,
  }));

  return (
    <div className="mt-4 space-y-4">
      {/* Map */}
      <div className="rounded-lg border border-border bg-surface-2 p-3 sm:p-5">
        <TrackSVG data={data} selectedCorners={selectedCorners} sectorMap={sectorMap} />
      </div>

      {/* Sector groups + corner buttons */}
      {corners.length > 0 && (
        <div className="space-y-3">
          {sectorGroups.map((s) => (
            <div key={s.id}>
              {/* Sector header chip — click to toggle all corners in this sector */}
              <div className="flex items-center gap-2 mb-1.5">
                <button
                  onClick={() => toggleSector(s.id as SectorId)}
                  className={cn(
                    "text-xs font-bold px-2.5 py-0.5 rounded border cursor-pointer select-none transition-colors",
                    s.allSelected ? s.btnActiveClass : s.chipClass,
                  )}
                >
                  {s.label}
                </button>
                <span className="text-xs text-muted-foreground">{s.corners.length} corners</span>
              </div>

              {/* Individual corner buttons */}
              <div className="flex flex-wrap gap-1.5">
                {s.corners.map((c) => {
                  const isSelected = selectedCorners.has(c.number);
                  return (
                    <button
                      key={c.number}
                      onClick={() => toggleCorner(c.number)}
                      className={cn(
                        "flex items-center justify-center w-10 h-8 rounded border text-xs font-mono font-semibold tabular-nums transition-all cursor-pointer select-none",
                        isSelected
                          ? s.btnActiveClass
                          : "border-border bg-surface-3 text-foreground/70 hover:bg-surface-2",
                      )}
                      style={isSelected ? { borderColor: s.color, color: s.color } : undefined}
                    >
                      T{c.number}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {selectedCorners.size > 0 && (
            <button
              onClick={() => setSelectedCorners(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear selection ({selectedCorners.size})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
