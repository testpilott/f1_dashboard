/**
 * Pure marker builders for the Circuit map. Both used to live inside
 * useMemo blocks in CircuitMap.tsx; pulling them out gives them names,
 * tests, and makes the parent component a thin orchestrator.
 */

import type { CircuitCorner, IncidentMarker } from "@/components/race/TrackSVG";
import type { CircuitDetails } from "@/lib/constants/circuitDetails";

/** Minimum shape we need off a /api/race-incidents row to render a marker. */
export interface RaceIncidentLike {
  x?: number | null;
  y?: number | null;
  lap_number: number | null;
  driver_number: number | null;
  flag: string | null;
  category: string;
  message: string;
}

/** Minimum shape we need off the /api/race-incidents response envelope. */
export interface IncidentsResponseLike {
  available?: boolean;
  incidents?: RaceIncidentLike[];
}

/**
 * Live race-control incidents → marker list. Drops rows missing a track
 * coordinate (some race-control events have no position).
 */
export function buildIncidentMarkers(
  incidentsData: IncidentsResponseLike | null | undefined,
): IncidentMarker[] {
  if (!incidentsData?.available || !incidentsData.incidents) return [];
  const out: IncidentMarker[] = [];
  for (const inc of incidentsData.incidents) {
    if (inc.x == null || inc.y == null) continue;
    out.push({
      x: inc.x,
      y: inc.y,
      meta: {
        lap_number: inc.lap_number,
        driver_number: inc.driver_number,
        flag: inc.flag,
        category: inc.category,
        message: inc.message,
        type: "incident",
      },
    });
  }
  return out;
}

/**
 * Curated CircuitDetails.notableHotspots → marker list. Joins each hotspot's
 * `corner` field to the live Multiviewer corners[] geometry so the marker
 * lands on the actual track location. Hotspots whose `corner` doesn't match
 * any of the route-returned corners are silently dropped — that's the
 * corner-number-drift guard called out in CIRCUIT_DETAILS_HANDOFF.md.
 */
export function buildHotspotMarkers(
  details: CircuitDetails | undefined,
  corners: CircuitCorner[] | undefined,
): IncidentMarker[] {
  const hotspots = details?.notableHotspots ?? [];
  const cornerArr = corners ?? [];
  if (hotspots.length === 0 || cornerArr.length === 0) return [];
  // Use a Map for O(1) join — relevant when a circuit has 20+ corners.
  const byNumber = new Map(cornerArr.map((c) => [c.number, c]));
  const out: IncidentMarker[] = [];
  for (const h of hotspots) {
    const corner = byNumber.get(h.corner);
    if (!corner) continue;
    out.push({
      x: corner.x,
      y: corner.y,
      meta: {
        lap_number: null,
        driver_number: null,
        flag: null,
        category: "Hotspot",
        message: h.description,
        type: "hotspot",
        name: h.name,
        description: h.description,
      },
    });
  }
  return out;
}
