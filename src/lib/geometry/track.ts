export function getSectorId(corner: { length: number }, maxLen: number): 1 | 2 | 3 {
  const frac = maxLen > 0 ? corner.length / maxLen : 0;
  return frac < 1 / 3 ? 1 : frac < 2 / 3 ? 2 : 3;
}

export function buildPolylinePoints(xs: number[], svgYs: number[], from: number, to: number): string {
  return xs
    .slice(from, to + 1)
    .map((x, i) => `${x},${svgYs[from + i]}`)
    .join(" ");
}

export function rotatePoint(
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
export function splitBySectors(
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