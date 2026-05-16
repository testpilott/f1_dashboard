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

// ─── Country flag emoji map ───────────────────────────────────────────────────

export const FLAG_MAP: Record<string, string> = {
  Australia: "🇦🇺",
  Bahrain: "🇧🇭",
  "Saudi Arabia": "🇸🇦",
  Japan: "🇯🇵",
  China: "🇨🇳",
  USA: "🇺🇸",
  "United States": "🇺🇸",
  Italy: "🇮🇹",
  Monaco: "🇲🇨",
  Canada: "🇨🇦",
  Spain: "🇪🇸",
  Austria: "🇦🇹",
  UK: "🇬🇧",
  "United Kingdom": "🇬🇧",
  "Great Britain": "🇬🇧",
  Hungary: "🇭🇺",
  Belgium: "🇧🇪",
  Netherlands: "🇳🇱",
  Azerbaijan: "🇦🇿",
  Singapore: "🇸🇬",
  Mexico: "🇲🇽",
  Brazil: "🇧🇷",
  UAE: "🇦🇪",
  "United Arab Emirates": "🇦🇪",
  "Abu Dhabi": "🇦🇪",
  Qatar: "🇶🇦",
  "Las Vegas": "🇺🇸",
  Miami: "🇺🇸",
};

export function getFlag(country: string): string {
  return FLAG_MAP[country] ?? "🏁";
}

// ─── Race status display labels (Jolpica positionText → label) ────────────────

export const STATUS_MAP: Record<string, string> = {
  R: "DNF",
  D: "DSQ",
  E: "EXC",
  W: "WD",
  F: "DNQ",
  N: "NC",
};

export function getStatusLabel(positionText: string): string {
  return STATUS_MAP[positionText] ?? positionText;
}

export const STATUS_TOOLTIP: Record<string, string> = {
  R: "Did Not Finish",
  D: "Disqualified",
  E: "Excluded",
  W: "Withdrew",
  F: "Did Not Qualify",
  N: "Not Classified",
};

export function getStatusTooltip(positionText: string): string {
  return STATUS_TOOLTIP[positionText] ?? positionText;
}
