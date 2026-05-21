"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogPortal,
  DialogBackdrop,
  DialogPopup,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { nearestPolylinePoint } from "@/lib/stats/incidents";

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

// ─── Incident types ───────────────────────────────────────────────────────────

export interface IncidentMeta {
  lap_number: number | null;
  driver_number: number | null;
  flag: string | null;
  category: string;
  message: string;
}

interface IncidentMarker {
  /** Raw Multiviewer/track coordinate — pre-transform */
  x: number;
  /** Raw Multiviewer/track coordinate — pre-transform */
  y: number;
  meta: IncidentMeta;
}

interface IncidentsPayload {
  available: boolean;
  reason?: string;
  incidents?: Array<{
    x: number | null;
    y: number | null;
    lap_number: number | null;
    driver_number: number | null;
    flag: string | null;
    category: string;
    message: string;
  }>;
}

async function fetchRaceIncidents(year: string, round: string): Promise<IncidentsPayload> {
  const res = await fetch(
    `/api/race-incidents?year=${encodeURIComponent(year)}&round=${encodeURIComponent(round)}`,
  );
  if (!res.ok) return { available: false, reason: "Failed to load incidents" };
  return res.json() as Promise<IncidentsPayload>;
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
  markers = [],
  onMarkerClick,
}: {
  data: CircuitInfoPayload;
  selectedCorners: Set<number>;
  sectorMap: Map<number, SectorId>;
  markers?: IncidentMarker[];
  onMarkerClick?: (meta: IncidentMeta) => void;
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
      {/* Incident markers — rendered last so they appear on top of track + corners
          Step 2.4 calibration: OpenF1 x,y are believed to share the Multiviewer
          coordinate space. Same rotatePoint transform as corners guarantees alignment.
          Each marker is snapped to the nearest polyline vertex. */}
      {markers.map((marker, idx) => {
        // Snap to track centerline before transforming
        const snapped = nearestPolylinePoint(xs, rawYs, marker.x, marker.y);
        // Apply same transform as corners: flip y, then rotate
        const pt = rotatePoint(snapped.x, -snapped.y, cx, cy, rotationDeg);
        const flagColor =
          marker.meta.flag === "RED"
            ? "#ef4444"
            : marker.meta.flag === "YELLOW" || marker.meta.flag === "DOUBLE YELLOW"
            ? "#f59e0b"
            : "var(--f1-red, #e10600)";
        return (
          <g
            key={idx}
            transform={`translate(${pt.x}, ${pt.y})`}
            style={{ cursor: "pointer" }}
            role="button"
            aria-label={`Incident: ${marker.meta.message}`}
            onClick={() => onMarkerClick?.(marker.meta)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onMarkerClick?.(marker.meta);
              }
            }}
          >
            {/* Glow ring */}
            <circle r={dotR * 2.6} fill={flagColor} opacity={0.22} />
            {/* Main marker */}
            <circle
              r={dotR * 1.4}
              fill={flagColor}
              stroke="white"
              strokeWidth={dotR * 0.25}
              opacity={0.92}
            />
            {/* Exclamation mark */}
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fontSize * 0.9}
              fontFamily="var(--font-mono, monospace)"
              fontWeight="700"
              fill="white"
            >
              !
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
  const [selectedIncident, setSelectedIncident] = useState<IncidentMeta | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading, isError } = useQuery<CircuitInfoPayload>({
    queryKey: ["circuit-info", year, round],
    queryFn: () => fetchCircuitInfo(year, round),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { data: incidentsData } = useQuery<IncidentsPayload>({
    queryKey: ["race-incidents", year, round],
    queryFn: () => fetchRaceIncidents(year, round),
    staleTime: 5 * 60 * 1000,
  });

  const markers = useMemo<IncidentMarker[]>(() => {
    if (!incidentsData?.available || !incidentsData.incidents) return [];
    return incidentsData.incidents
      .filter((inc) => inc.x != null && inc.y != null)
      .map((inc) => ({
        x: inc.x!,
        y: inc.y!,
        meta: {
          lap_number: inc.lap_number,
          driver_number: inc.driver_number,
          flag: inc.flag,
          category: inc.category,
          message: inc.message,
        },
      }));
  }, [incidentsData]);

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

  const handleMarkerClick = (meta: IncidentMeta) => {
    setSelectedIncident(meta);
    setDialogOpen(true);
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
        <TrackSVG
          data={data}
          selectedCorners={selectedCorners}
          sectorMap={sectorMap}
          markers={markers}
          onMarkerClick={handleMarkerClick}
        />
        {markers.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            {markers.length} incident marker{markers.length !== 1 ? "s" : ""} — click to view detail
          </p>
        )}
      </div>

      {/* Incident detail dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setSelectedIncident(null); }}>
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup>
            <div className="flex items-center justify-between mb-3">
              <DialogTitle className="text-base font-bold">
                {selectedIncident?.category === "CarEvent" ? "Incident" :
                 selectedIncident?.flag ? `${selectedIncident.flag} Flag` : "Race Control"}
              </DialogTitle>
              <DialogClose className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <X size={16} />
              </DialogClose>
            </div>
            {selectedIncident && (
              <div className="space-y-2 text-sm">
                {selectedIncident.lap_number != null && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-20 shrink-0">Lap</span>
                    <span className="font-mono font-semibold">{selectedIncident.lap_number}</span>
                  </div>
                )}
                {selectedIncident.driver_number != null && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-20 shrink-0">Driver #</span>
                    <span className="font-mono font-semibold">{selectedIncident.driver_number}</span>
                  </div>
                )}
                {selectedIncident.flag && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-20 shrink-0">Flag</span>
                    <span className="font-semibold">{selectedIncident.flag}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-20 shrink-0">Message</span>
                  <span className="text-foreground/90 leading-relaxed">{selectedIncident.message}</span>
                </div>
              </div>
            )}
            <DialogDescription className="sr-only">
              Race control incident detail
            </DialogDescription>
          </DialogPopup>
        </DialogPortal>
      </Dialog>

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
