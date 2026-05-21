// ─── F1 Team colours (2026 season) ───────────────────────────────────────────

export const TEAM_COLORS: Record<string, string> = {
  Mercedes: "#00D2BE",
  Ferrari: "#E8002D",
  "Red Bull": "#3671C6",
  "Red Bull Racing": "#3671C6",
  McLaren: "#FF8000",
  Alpine: "#0093CC",
  "Alpine F1 Team": "#0093CC",
  "BWT Alpine F1 Team": "#0093CC",
  Audi: "#C92D4B",
  Haas: "#B6BABD",
  "Haas F1 Team": "#B6BABD",
  "TGR Haas F1 Team": "#B6BABD",
  Williams: "#37BEDD",
  "Williams Racing": "#37BEDD",
  "Aston Martin": "#358C75",
  "RB F1 Team": "#6692FF",
  RB: "#6692FF",
  "Racing Bulls": "#6692FF",
  Cadillac: "#E8002D",
  "Cadillac F1 Team": "#E8002D",
  default: "#6B7280",
};

export function getTeamColor(teamName: string): string {
  return TEAM_COLORS[teamName] ?? TEAM_COLORS.default;
}

// ─── F1 Team logos (2026 season) ─────────────────────────────────────────────
// Logos downloaded from the official Formula 1 CDN (media.formula1.com) and
// served as local static files to avoid external dependency / CORS issues.
// Files live in /public/logos/{f1Id}.webp  (coloured variant where available).

/** Maps constructor name → /logos/*.webp local path */
export const TEAM_LOGOS: Record<string, string> = {
  // ── Canonical short names ──────────────────────────────────────────────────
  Ferrari:        "/logos/ferrari.webp",
  McLaren:        "/logos/mclaren.webp",
  Mercedes:       "/logos/mercedes.webp",
  "Red Bull":     "/logos/redbullracing.webp",
  "Aston Martin": "/logos/astonmartin.webp",
  Alpine:         "/logos/alpine.webp",
  Williams:       "/logos/williams.webp",
  Haas:           "/logos/haasf1team.webp",
  Audi:           "/logos/audi.webp",
  Cadillac:       "/logos/cadillac.webp",
  RB:             "/logos/racingbulls.webp",

  // ── Full constructor names returned by Jolpica API ─────────────────────────
  "Scuderia Ferrari":            "/logos/ferrari.webp",
  "Scuderia Ferrari HP":         "/logos/ferrari.webp",
  "McLaren F1 Team":             "/logos/mclaren.webp",
  "McLaren Racing":              "/logos/mclaren.webp",
  "Mercedes-AMG Petronas F1 Team": "/logos/mercedes.webp",
  "Red Bull Racing":             "/logos/redbullracing.webp",
  "Aston Martin Aramco F1 Team": "/logos/astonmartin.webp",
  "Aston Martin F1 Team":        "/logos/astonmartin.webp",
  "Alpine F1 Team":              "/logos/alpine.webp",
  "BWT Alpine F1 Team":          "/logos/alpine.webp",
  "Williams Racing":             "/logos/williams.webp",
  "Haas F1 Team":                "/logos/haasf1team.webp",
  "TGR Haas F1 Team":            "/logos/haasf1team.webp",
  "Audi F1 Team":                "/logos/audi.webp",
  "Audi Revolut F1 Team":        "/logos/audi.webp",
  "Cadillac F1 Team":            "/logos/cadillac.webp",
  "Racing Bulls":                "/logos/racingbulls.webp",
  "RB F1 Team":                  "/logos/racingbulls.webp",
};

export function getTeamLogo(teamName: string): string | undefined {
  return TEAM_LOGOS[teamName];
}

/**
 * Builds the official F1 CDN driver headshot URL.
 * Pattern: {FamilyName}{GivenInitial}.png  e.g. "VerstappenM"
 * Year defaults to "2026". Falls back gracefully if image is missing.
 */
export function getDriverPhotoUrl(familyName: string, givenName: string, year = "2026"): string {
  const surname = familyName.replace(/[\s-]/g, "");
  const initial = (givenName.charAt(0) ?? "").toUpperCase();
  return `https://media.formula1.com/image/upload/f_auto,c_limit,q_auto,w_320/content/dam/fom-website/drivers/${year}Drivers/${surname}${initial}.png`;
}
