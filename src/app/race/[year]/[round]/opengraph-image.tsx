import { ImageResponse } from "next/og";
import { getSchedule } from "@/lib/api/jolpica";

export const runtime = "edge";
export const alt = "F1 Race";
export const size = { width: 1200, height: 630 } as const;
export const contentType = "image/png";

export default async function RaceOpenGraphImage({
  params,
}: {
  params: { year: string; round: string };
}) {
  const { year, round } = params;

  let title = `${year} F1 Race`;
  let subtitle = "F1 Dashboard";
  try {
    const races = await getSchedule(year);
    const race = races.find((r) => r.round === round);
    if (race) {
      title = `${year} ${race.raceName}`;
      subtitle = `${race.Circuit.circuitName} · ${race.Circuit.Location.country}`;
    }
  } catch {
    // Degrade silently to the static title — OG image must never throw.
  }

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
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          F1 Dashboard
        </div>
        <div
          style={{
            fontSize: 92,
            fontWeight: 900,
            letterSpacing: -2,
            lineHeight: 1.05,
            maxWidth: "90%",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 36, color: "#9ca3af", marginTop: 24 }}>
          {subtitle}
        </div>
      </div>
    ),
    { ...size },
  );
}
