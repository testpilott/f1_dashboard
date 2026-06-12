import { ImageResponse } from "next/og";

// Next ImageResponse requires the edge runtime.
export const runtime = "edge";
export const alt = "F1 Dashboard";
export const size = { width: 1200, height: 630 } as const;
export const contentType = "image/png";

// Hex literals are intentional here — ImageResponse cannot resolve CSS custom
// properties; the colors mirror the F1-red token (#e10600) and the dark
// surface token (#0a0a0a) used in globals.css.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "0 80px",
          background: "#0a0a0a",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            color: "#e10600",
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          Formula 1
        </div>
        <div
          style={{
            fontSize: 120,
            fontWeight: 900,
            letterSpacing: -3,
            lineHeight: 1,
          }}
        >
          F1 Dashboard
        </div>
        <div style={{ fontSize: 36, color: "#9ca3af", marginTop: 32 }}>
          Live standings · race results · telemetry · projections
        </div>
      </div>
    ),
    { ...size },
  );
}
