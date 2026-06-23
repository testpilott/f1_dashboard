/**
 * Pure helpers powering TrackSVG. Everything in this file is data → data:
 * no React, no DOM, no SVG. Co-located unit tests pin the math so the
 * presentational component (TrackSVG) stays a thin renderer.
 */

import { rotatePoint } from "@/lib/geometry/track";
import type { IncidentMeta } from "@/components/race/TrackSVG";

export interface TrackTransform {
  /** Rotated SVG-space xs (track polyline). */
  trackXs: number[];
  /** Rotated SVG-space ys (track polyline). */
  trackYs: number[];
  /** SVG viewBox bounds — minX, minY, width, height, all already padded. */
  viewBox: { x: number; y: number; w: number; h: number };
  /** Centre point of the rotated track (re-used to rotate marker positions). */
  cx: number;
  cy: number;
  /** Rotation applied (in degrees, SVG-space). */
  rotationDeg: number;
  /** Derived size tokens — radius, stroke width, font size. */
  dotR: number;
  trackW: number;
  fontSize: number;
  /** True when the input was too small to render anything. */
  empty: boolean;
}

/**
 * Compute the rotated polyline + viewBox + size tokens for a track.
 *
 * - Multiviewer uses math coords (y up); we flip y so SVG renders correctly.
 * - Rotation from Multiviewer is in math-coord space — invert the sign for
 *   SVG space after the flip.
 * - viewBox has 7% padding on every side so corner markers don't clip.
 *
 * Returns `empty: true` for degenerate input (so the caller can render null).
 */
export function computeTrackTransform(
  xs: number[],
  rawYs: number[],
  rotation: number | undefined,
): TrackTransform {
  if (xs.length < 2 || rawYs.length !== xs.length) {
    return {
      trackXs: [],
      trackYs: [],
      viewBox: { x: 0, y: 0, w: 0, h: 0 },
      cx: 0,
      cy: 0,
      rotationDeg: 0,
      dotR: 0,
      trackW: 0,
      fontSize: 0,
      empty: true,
    };
  }

  const svgYs = rawYs.map((y) => -y);
  const baseMinX = Math.min(...xs);
  const baseMaxX = Math.max(...xs);
  const baseMinY = Math.min(...svgYs);
  const baseMaxY = Math.max(...svgYs);
  const cx = (baseMinX + baseMaxX) / 2;
  const cy = (baseMinY + baseMaxY) / 2;

  const rotationDeg =
    typeof rotation === "number" && Number.isFinite(rotation) ? -rotation : 0;

  const rotatedTrack = xs.map((x, i) => rotatePoint(x, svgYs[i], cx, cy, rotationDeg));
  const trackXs = rotatedTrack.map((p) => p.x);
  const trackYs = rotatedTrack.map((p) => p.y);

  const minX = Math.min(...trackXs);
  const maxX = Math.max(...trackXs);
  const minY = Math.min(...trackYs);
  const maxY = Math.max(...trackYs);
  const span = Math.max(maxX - minX, maxY - minY);
  const pad = span * 0.07;

  return {
    trackXs,
    trackYs,
    viewBox: {
      x: minX - pad,
      y: minY - pad,
      w: maxX - minX + pad * 2,
      h: maxY - minY + pad * 2,
    },
    cx,
    cy,
    rotationDeg,
    dotR: span * 0.014,
    trackW: span * 0.014, // matches dotR * 1.0 in the original
    fontSize: span * 0.014 * 1.3,
    empty: false,
  };
}

/**
 * Format a viewBox object as the SVG `viewBox` attribute string.
 * Pulled out so the format isn't sprinkled around the JSX.
 */
export function viewBoxAttr(vb: { x: number; y: number; w: number; h: number }): string {
  return `${vb.x} ${vb.y} ${vb.w} ${vb.h}`;
}

/**
 * Pick the fill colour for a marker. Hotspots get the cyan curated-corner
 * token; race-day incidents map flag → red/yellow/default. Centralised here
 * because the original three-deep nested ternary was the easiest line of
 * code in the file to misread.
 */
export function markerFillColor(meta: IncidentMeta): string {
  if (meta.type === "hotspot") return "var(--hotspot-marker)";
  if (meta.flag === "RED") return "var(--incident-red)";
  if (meta.flag === "YELLOW" || meta.flag === "DOUBLE YELLOW") {
    return "var(--incident-yellow)";
  }
  return "var(--incident-default)";
}

/** "★" for curated hotspots; "!" for race-day incidents. */
export function markerGlyph(meta: IncidentMeta): string {
  return meta.type === "hotspot" ? "★" : "!";
}

/**
 * Marker aria-label. Hotspots prefer the curated `name` (with a `message`
 * fallback for the unlikely case where `type` was set without a name);
 * incidents use the race-control `message`.
 */
export function markerAriaLabel(meta: IncidentMeta): string {
  if (meta.type === "hotspot") {
    return `Notable corner: ${meta.name ?? meta.message}`;
  }
  return `Incident: ${meta.message}`;
}
