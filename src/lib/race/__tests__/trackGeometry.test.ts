import { describe, it, expect } from "vitest";
import {
  computeTrackTransform,
  viewBoxAttr,
  markerFillColor,
  markerGlyph,
  markerAriaLabel,
} from "@/lib/race/trackGeometry";
import type { IncidentMeta } from "@/components/race/TrackSVG";

const meta = (over: Partial<IncidentMeta> = {}): IncidentMeta => ({
  lap_number: 1,
  driver_number: 44,
  flag: null,
  category: "CarEvent",
  message: "Car off at T6",
  ...over,
});

describe("computeTrackTransform", () => {
  it("returns empty: true for fewer than 2 points", () => {
    expect(computeTrackTransform([], [], 0).empty).toBe(true);
    expect(computeTrackTransform([1], [1], 0).empty).toBe(true);
  });

  it("returns empty: true when x and y arrays disagree in length", () => {
    expect(computeTrackTransform([1, 2, 3], [1, 2], 0).empty).toBe(true);
  });

  it("flips y (Multiviewer math coords → SVG screen coords)", () => {
    // A simple two-point segment running along positive y in math space
    // must end up with negative y in SVG space after the flip.
    const t = computeTrackTransform([0, 0], [0, 10], 0);
    expect(t.trackYs[0]).toBeGreaterThan(t.trackYs[1]); // first point above the second in SVG y
  });

  it("computes the centre as the midpoint of the (post-flip) bounds", () => {
    const t = computeTrackTransform([0, 10, 10, 0], [0, 0, 10, 10], 0);
    expect(t.cx).toBe(5);
    // SVG y = -mathY so y range is [-10, 0], centre = -5
    expect(t.cy).toBe(-5);
  });

  it("inverts the rotation sign to match the y-flip (SVG-space rotation)", () => {
    const t = computeTrackTransform([0, 10], [0, 10], 90);
    expect(t.rotationDeg).toBe(-90);
  });

  it("treats a non-finite rotation as 0", () => {
    expect(computeTrackTransform([0, 10], [0, 10], NaN).rotationDeg).toBe(0);
    expect(
      computeTrackTransform([0, 10], [0, 10], undefined).rotationDeg,
    ).toBe(0);
  });

  it("adds 7% padding around the bounding box", () => {
    // 100x100 square in math space → SVG y becomes 0..-100, span = 100.
    // Padding = 7. viewBox width/height = 100 + 14 = 114.
    const t = computeTrackTransform([0, 100, 100, 0], [0, 0, 100, 100], 0);
    expect(t.viewBox.w).toBeCloseTo(114, 5);
    expect(t.viewBox.h).toBeCloseTo(114, 5);
  });

  it("sizes the size tokens from the span", () => {
    const t = computeTrackTransform([0, 100, 100, 0], [0, 0, 100, 100], 0);
    expect(t.dotR).toBeCloseTo(100 * 0.014, 5);
    expect(t.trackW).toBeCloseTo(100 * 0.014, 5);
    expect(t.fontSize).toBeCloseTo(100 * 0.014 * 1.3, 5);
  });
});

describe("viewBoxAttr", () => {
  it("renders the viewBox object as a four-number string", () => {
    expect(viewBoxAttr({ x: -7, y: -107, w: 114, h: 114 })).toBe("-7 -107 114 114");
  });
});

describe("markerFillColor", () => {
  it("returns the hotspot token for hotspot markers regardless of flag", () => {
    expect(markerFillColor(meta({ type: "hotspot" }))).toBe(
      "var(--hotspot-marker)",
    );
    expect(
      markerFillColor(meta({ type: "hotspot", flag: "RED" })),
    ).toBe("var(--hotspot-marker)");
  });

  it("maps RED flag to the incident-red token", () => {
    expect(markerFillColor(meta({ flag: "RED" }))).toBe("var(--incident-red)");
  });

  it("maps YELLOW and DOUBLE YELLOW to the incident-yellow token", () => {
    expect(markerFillColor(meta({ flag: "YELLOW" }))).toBe(
      "var(--incident-yellow)",
    );
    expect(markerFillColor(meta({ flag: "DOUBLE YELLOW" }))).toBe(
      "var(--incident-yellow)",
    );
  });

  it("falls back to the incident-default token for null / unknown flags", () => {
    expect(markerFillColor(meta({ flag: null }))).toBe(
      "var(--incident-default)",
    );
    expect(markerFillColor(meta({ flag: "BLUE" }))).toBe(
      "var(--incident-default)",
    );
  });
});

describe("markerGlyph", () => {
  it("returns ★ for hotspots and ! for incidents", () => {
    expect(markerGlyph(meta({ type: "hotspot" }))).toBe("★");
    expect(markerGlyph(meta({ type: "incident" }))).toBe("!");
    expect(markerGlyph(meta())).toBe("!"); // unset type → incident
  });
});

describe("markerAriaLabel", () => {
  it("uses the hotspot name when present", () => {
    expect(
      markerAriaLabel(
        meta({ type: "hotspot", name: "Eau Rouge", message: "fallback" }),
      ),
    ).toBe("Notable corner: Eau Rouge");
  });

  it("falls back to message when a hotspot has no name", () => {
    expect(
      markerAriaLabel(meta({ type: "hotspot", message: "Iconic corner" })),
    ).toBe("Notable corner: Iconic corner");
  });

  it("uses the race-control message for incidents", () => {
    expect(markerAriaLabel(meta({ message: "Yellow at T6" }))).toBe(
      "Incident: Yellow at T6",
    );
  });
});
