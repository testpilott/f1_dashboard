// ─── F1 Team colours (2026 season) ───────────────────────────────────────────

export const TEAM_COLORS: Record<string, string> = {
  Mercedes: "#00D2BE",
  Ferrari: "#E8002D",
  "Red Bull": "#3671C6",
  "Red Bull Racing": "#3671C6",
  McLaren: "#FF8000",
  Alpine: "#0093CC",
  "Alpine F1 Team": "#0093CC",
  Audi: "#C92D4B",
  Haas: "#B6BABD",
  "Haas F1 Team": "#B6BABD",
  Williams: "#37BEDD",
  "Williams Racing": "#37BEDD",
  "Aston Martin": "#358C75",
  "RB F1 Team": "#6692FF",
  RB: "#6692FF",
  Cadillac: "#1E1E1E",
  "Cadillac F1 Team": "#1E1E1E",
  default: "#6B7280",
};

export function getTeamColor(teamName: string): string {
  return TEAM_COLORS[teamName] ?? TEAM_COLORS.default;
}

// ─── F1 Circuit Coordinates (for weather lookups) ────────────────────────────

export const CIRCUIT_COORDS: Record<string, { lat: number; lng: number; timezone: string }> = {
  Bahrain: { lat: 26.032, lng: 50.511, timezone: "Asia/Bahrain" },
  "Saudi Arabia": { lat: 21.632, lng: 39.104, timezone: "Asia/Riyadh" },
  Australia: { lat: -37.849, lng: 144.968, timezone: "Australia/Melbourne" },
  Japan: { lat: 34.844, lng: 136.541, timezone: "Asia/Tokyo" },
  China: { lat: 31.338, lng: 121.22, timezone: "Asia/Shanghai" },
  Miami: { lat: 25.958, lng: -80.239, timezone: "America/New_York" },
  "Emilia Romagna": { lat: 44.344, lng: 11.713, timezone: "Europe/Rome" },
  Monaco: { lat: 43.737, lng: 7.421, timezone: "Europe/Monaco" },
  Canada: { lat: 45.505, lng: -73.522, timezone: "America/Montreal" },
  Spain: { lat: 41.57, lng: 2.261, timezone: "Europe/Madrid" },
  Austria: { lat: 47.22, lng: 14.764, timezone: "Europe/Vienna" },
  "Great Britain": { lat: 52.07, lng: -1.017, timezone: "Europe/London" },
  Hungary: { lat: 47.583, lng: 19.251, timezone: "Europe/Budapest" },
  Belgium: { lat: 50.437, lng: 5.971, timezone: "Europe/Brussels" },
  Netherlands: { lat: 52.389, lng: 4.540, timezone: "Europe/Amsterdam" },
  Italy: { lat: 45.620, lng: 9.289, timezone: "Europe/Rome" },
  Azerbaijan: { lat: 40.372, lng: 49.853, timezone: "Asia/Baku" },
  Singapore: { lat: 1.291, lng: 103.864, timezone: "Asia/Singapore" },
  "United States": { lat: 30.133, lng: -97.641, timezone: "America/Chicago" },
  Mexico: { lat: 19.404, lng: -99.091, timezone: "America/Mexico_City" },
  Brazil: { lat: -23.701, lng: -46.697, timezone: "America/Sao_Paulo" },
  "Las Vegas": { lat: 36.172, lng: -115.150, timezone: "America/Los_Angeles" },
  Qatar: { lat: 25.49, lng: 51.454, timezone: "Asia/Qatar" },
  "Abu Dhabi": { lat: 24.467, lng: 54.603, timezone: "Asia/Dubai" },
};

// ─── Tyre compound colours ────────────────────────────────────────────────────

export const TYRE_COLORS: Record<string, string> = {
  SOFT: "#E8002D",
  MEDIUM: "#FFF200",
  HARD: "#FFFFFF",
  INTERMEDIATE: "#39B54A",
  WET: "#0067FF",
  UNKNOWN: "#6B7280",
};

// ─── Sector mini-sector segment value → colour mapping ───────────────────────
// https://openf1.org/docs/#laps (segments_sector_N)

export const SEGMENT_COLORS: Record<number, SectorColorName> = {
  2048: "white",    // not available / no data
  2049: "green",    // personal best (green)
  2051: "purple",   // overall best (purple)
  2064: "pitlane",  // pit lane
};

export type SectorColorName = "purple" | "green" | "yellow" | "white" | "pitlane";

export function getSegmentColor(value: number): SectorColorName {
  return SEGMENT_COLORS[value] ?? "yellow";
}

export const SEGMENT_HEX: Record<SectorColorName, string> = {
  purple: "#9B59B6",
  green: "#27AE60",
  yellow: "#F1C40F",
  white: "#4B5563",
  pitlane: "#374151",
};

// ─── News RSS feed sources ────────────────────────────────────────────────────

export const NEWS_FEEDS = [
  { name: "Autosport", url: "https://www.autosport.com/rss/f1/news/", category: "f1" },
  { name: "Motorsport.com", url: "https://www.motorsport.com/rss/f1/news/", category: "f1" },
  { name: "The Race", url: "https://the-race.com/category/formula-1/feed/", category: "f1" },
];

// ─── Points system ────────────────────────────────────────────────────────────

export const POINTS_SYSTEM = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
export const SPRINT_POINTS_SYSTEM = [8, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
export const FASTEST_LAP_POINT = 1; // bonus point if in top 10

// ─── WMO weather code → human label ──────────────────────────────────────────

export function getWeatherLabel(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 2) return "Mainly clear";
  if (code === 3) return "Overcast";
  if (code <= 49) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  if (code <= 99) return "Thunderstorm";
  return "Unknown";
}

export function getWeatherIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code <= 49) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  if (code <= 99) return "⛈️";
  return "🌡️";
}
