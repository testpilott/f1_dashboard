import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "F1 Dashboard",
    short_name: "F1 Dash",
    description:
      "Live Formula 1 standings, race results, telemetry and championship projections.",
    start_url: "/",
    display: "standalone",
    // Match globals.css token surface and the F1-red accent.
    background_color: "#0a0a0a",
    theme_color: "#e10600",
    icons: [
      // Reuse the existing SVG logo; browsers accept SVG in manifests.
      { src: "/logo-f1dash.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
