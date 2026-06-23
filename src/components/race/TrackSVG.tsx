import { nearestPolylinePoint } from "@/lib/stats/incidents";
import { rotatePoint, splitBySectors } from "@/lib/geometry/track";
import {
  computeTrackTransform,
  markerAriaLabel,
  markerFillColor,
  markerGlyph,
  viewBoxAttr,
} from "@/lib/race/trackGeometry";
import type { CircuitDetails } from "@/lib/constants/circuitDetails";

export type SectorId = 1 | 2 | 3;

export interface CircuitCorner {
  number: number;
  x: number;
  y: number;
  length: number;
}

export interface CircuitInfoPayload {
  available: boolean;
  reason?: string;
  /** Jolpica/Ergast circuit identifier (e.g. "spa", "monaco"). */
  circuitId?: string;
  circuitName?: string;
  country?: string;
  locality?: string;
  corners?: CircuitCorner[];
  trackX?: number[];
  trackY?: number[];
  trackPositionTime?: number[];
  rotation?: number;
  /** Curated reference data — see src/lib/constants/circuitDetails.ts. */
  details?: CircuitDetails;
}

export interface IncidentMeta {
  lap_number: number | null;
  driver_number: number | null;
  flag: string | null;
  category: string;
  message: string;
  /**
   * Marker variant. `"incident"` (default when absent) is a live-race
   * race-control incident; `"hotspot"` is a curated notable corner from
   * `circuitDetails.notableHotspots`.
   */
  type?: "incident" | "hotspot";
  /** Hotspot display name (e.g. "Eau Rouge–Raidillon"). Only set when type = "hotspot". */
  name?: string;
  /** Hotspot description. Only set when type = "hotspot". */
  description?: string;
}

export interface IncidentMarker {
  x: number;
  y: number;
  meta: IncidentMeta;
}

export interface TrackSectorStyle {
  id: SectorId;
  color: string;
  dimColor: string;
}

export default function TrackSVG({
  data,
  selectedCorners,
  sectorMap,
  sectorStyles,
  markers = [],
  onMarkerClick,
}: {
  data: CircuitInfoPayload;
  selectedCorners: Set<number>;
  sectorMap: Map<number, SectorId>;
  sectorStyles: readonly TrackSectorStyle[];
  markers?: IncidentMarker[];
  onMarkerClick?: (meta: IncidentMeta) => void;
}) {
  const xs = data.trackX ?? [];
  const rawYs = data.trackY ?? [];

  const t = computeTrackTransform(xs, rawYs, data.rotation);
  if (t.empty) return null;
  const { trackXs, trackYs, viewBox, cx, cy, rotationDeg, dotR, trackW, fontSize } = t;

  const [seg1, seg2, seg3] = splitBySectors(trackXs, trackYs, data.trackPositionTime ?? []);
  const corners = data.corners ?? [];

  const renderCorner = (corner: CircuitCorner, selected: boolean, key: string) => {
    const sector = sectorMap.get(corner.number) ?? 1;
    const sc = sectorStyles[sector - 1];
    const cornerPoint = rotatePoint(corner.x, -corner.y, cx, cy, rotationDeg);

    if (!selected) {
      return (
        <g key={key} transform={`translate(${cornerPoint.x}, ${cornerPoint.y})`}>
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
            {corner.number}
          </text>
        </g>
      );
    }

    return (
      <g key={key} transform={`translate(${cornerPoint.x}, ${cornerPoint.y})`}>
        <circle r={dotR * 2.4} fill={sc.dimColor} />
        <circle r={dotR * 1.5} fill={sc.color} />
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize * 1.1}
          fontFamily="var(--font-mono, monospace)"
          fontWeight="700"
          fill="white"
        >
          {corner.number}
        </text>
      </g>
    );
  };

  return (
    <svg
      viewBox={viewBoxAttr(viewBox)}
      className="w-full h-auto"
      style={{ maxHeight: "560px" }}
      aria-label={`${data.circuitName ?? "Circuit"} track map`}
      role="img"
    >
      {([seg1, seg2, seg3] as const).map((pts, idx) =>
        pts ? (
          <polyline
            key={idx}
            points={pts}
            fill="none"
            stroke={sectorStyles[idx].color}
            strokeWidth={trackW}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.75}
          />
        ) : null,
      )}

      <line
        x1={trackXs[trackXs.length - 1]}
        y1={trackYs[trackYs.length - 1]}
        x2={trackXs[0]}
        y2={trackYs[0]}
        stroke={sectorStyles[2].color}
        strokeWidth={trackW}
        strokeLinecap="round"
        opacity={0.75}
      />

      <circle cx={trackXs[0]} cy={trackYs[0]} r={dotR * 1.8} fill="white" opacity={0.9} />

      {([false, true] as const).map((selected) =>
        corners
          .filter((corner) => selectedCorners.has(corner.number) === selected)
          .map((corner, idx) =>
            renderCorner(corner, selected, `${selected ? "sel" : "base"}-${corner.number}-${idx}`),
          ),
      )}

      {/*
       * Markers are drawn in two passes so curated hotspots sit BELOW any
       * live-race incidents at the same corner — incidents are about the
       * race the user is currently looking at and should always win the
       * click on overlap.
       */}
      {([true, false] as const).flatMap((isHotspotPass) =>
        markers
          .filter((m) => (m.meta.type === "hotspot") === isHotspotPass)
          .map((marker, idx) => {
            const snapped = nearestPolylinePoint(xs, rawYs, marker.x, marker.y);
            const pt = rotatePoint(snapped.x, -snapped.y, cx, cy, rotationDeg);
            const isHotspot = marker.meta.type === "hotspot";
            const fillColor = markerFillColor(marker.meta);
            const glyph = markerGlyph(marker.meta);
            const ariaLabel = markerAriaLabel(marker.meta);

            return (
              <g
                key={`${isHotspotPass ? "h" : "i"}-${idx}`}
                transform={`translate(${pt.x}, ${pt.y})`}
                style={{ cursor: "pointer" }}
                role="button"
                aria-label={ariaLabel}
                data-marker-type={isHotspot ? "hotspot" : "incident"}
                onClick={() => onMarkerClick?.(marker.meta)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onMarkerClick?.(marker.meta);
                  }
                }}
              >
                <circle r={dotR * 2.6} fill={fillColor} opacity={0.22} />
                <circle
                  r={dotR * 1.4}
                  fill={fillColor}
                  stroke="white"
                  strokeWidth={dotR * 0.25}
                  opacity={0.92}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={fontSize * 0.9}
                  fontFamily="var(--font-mono, monospace)"
                  fontWeight="700"
                  fill="white"
                >
                  {glyph}
                </text>
              </g>
            );
          }),
      )}
    </svg>
  );
}
