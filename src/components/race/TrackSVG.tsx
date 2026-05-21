import { nearestPolylinePoint } from "@/lib/stats/incidents";
import { rotatePoint, splitBySectors } from "@/lib/geometry/track";

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
  circuitName?: string;
  country?: string;
  locality?: string;
  corners?: CircuitCorner[];
  trackX?: number[];
  trackY?: number[];
  trackPositionTime?: number[];
  rotation?: number;
}

export interface IncidentMeta {
  lap_number: number | null;
  driver_number: number | null;
  flag: string | null;
  category: string;
  message: string;
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
      viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`}
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

      {markers.map((marker, idx) => {
        const snapped = nearestPolylinePoint(xs, rawYs, marker.x, marker.y);
        const pt = rotatePoint(snapped.x, -snapped.y, cx, cy, rotationDeg);
        const flagColor =
          marker.meta.flag === "RED"
            ? "var(--incident-red)"
            : marker.meta.flag === "YELLOW" || marker.meta.flag === "DOUBLE YELLOW"
              ? "var(--incident-yellow)"
              : "var(--incident-default)";

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
            <circle r={dotR * 2.6} fill={flagColor} opacity={0.22} />
            <circle
              r={dotR * 1.4}
              fill={flagColor}
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
              !
            </text>
          </g>
        );
      })}
    </svg>
  );
}
