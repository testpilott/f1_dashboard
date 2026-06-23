/**
 * Sector classification + selection helpers for the Circuit-map corner
 * picker. The view layer treats sectors as opaque IDs (1/2/3); this
 * module owns the per-corner-length classification + the bulk
 * "all selected?" check the sector chip uses.
 */

import { getSectorId } from "@/lib/geometry/track";
import type { CircuitCorner, SectorId } from "@/components/race/TrackSVG";

/** Map from corner number → sector id (1/2/3). Empty when no corners. */
export function buildSectorMap(
  corners: CircuitCorner[] | undefined,
): Map<number, SectorId> {
  const arr = corners ?? [];
  if (arr.length === 0) return new Map();
  const maxLen = Math.max(...arr.map((c) => c.length), 1);
  return new Map(arr.map((c) => [c.number, getSectorId(c, maxLen)]));
}

export interface SectorGroup<S> {
  /** Sector style entries (S1/S2/S3 chip styling) — passed through. */
  sector: S;
  /** Corners that belong to this sector. */
  corners: CircuitCorner[];
  /** True when every corner in this sector is selected (and the group isn't empty). */
  allSelected: boolean;
}

/**
 * Group corners by sector and tag whether the whole sector is currently
 * selected (used to switch the sector chip between "active" and "chip" style).
 */
export function buildSectorGroups<S extends { id: SectorId }>(
  sectors: readonly S[],
  corners: CircuitCorner[] | undefined,
  sectorMap: Map<number, SectorId>,
  selectedCorners: Set<number>,
): SectorGroup<S>[] {
  const arr = corners ?? [];
  return sectors.map((sector) => {
    const inSector = arr.filter(
      (c) => (sectorMap.get(c.number) ?? 1) === sector.id,
    );
    const allSelected =
      inSector.length > 0 && inSector.every((c) => selectedCorners.has(c.number));
    return { sector, corners: inSector, allSelected };
  });
}

/**
 * Toggle every corner in a sector at once. If the whole sector is currently
 * selected, remove them all; otherwise add them all. Returns the next Set
 * so the caller can wrap it in `setSelectedCorners(next)`.
 */
export function toggleSectorSelection(
  prev: Set<number>,
  sectorId: SectorId,
  corners: CircuitCorner[] | undefined,
  sectorMap: Map<number, SectorId>,
): Set<number> {
  const inSector = (corners ?? [])
    .filter((c) => (sectorMap.get(c.number) ?? 1) === sectorId)
    .map((c) => c.number);
  const allOn = inSector.every((n) => prev.has(n));
  const next = new Set(prev);
  if (allOn) for (const n of inSector) next.delete(n);
  else for (const n of inSector) next.add(n);
  return next;
}

/** Toggle one corner. Returns the next Set so caller can set state. */
export function toggleOneCorner(prev: Set<number>, n: number): Set<number> {
  const next = new Set(prev);
  if (next.has(n)) next.delete(n);
  else next.add(n);
  return next;
}
