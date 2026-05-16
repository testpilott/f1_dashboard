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

// ─── Circuit track outline images (F1 CDN) ────────────────────────────────────
// Keys are Jolpica circuitId values (unique per circuit, returned by /current.json).
// Using circuitId instead of country avoids collisions where multiple races share
// a country (e.g. USA → Miami/Austin/Las Vegas, Spain → Barcelona/Madrid).

const CDN_BASE = "https://media.formula1.com/image/upload/common/f1/2026/track";

const CIRCUIT_IMAGE_SLUGS: Record<string, string> = {
  albert_park: "melbourne",      // Australian GP
  shanghai: "shanghai",          // Chinese GP
  suzuka: "suzuka",              // Japanese GP
  miami: "miami",                // Miami GP
  villeneuve: "montreal",        // Canadian GP
  monaco: "montecarlo",          // Monaco GP
  catalunya: "catalunya",        // Barcelona GP
  red_bull_ring: "spielberg",    // Austrian GP
  silverstone: "silverstone",    // British GP
  spa: "spafrancorchamps",       // Belgian GP
  hungaroring: "hungaroring",    // Hungarian GP
  zandvoort: "zandvoort",        // Dutch GP
  monza: "monza",                // Italian GP
  madring: "madring",            // Spanish GP (Madrid)
  baku: "baku",                  // Azerbaijan GP
  marina_bay: "singapore",       // Singapore GP
  americas: "austin",            // US GP
  rodriguez: "mexicocity",       // Mexico City GP
  interlagos: "interlagos",      // Brazilian GP
  vegas: "lasvegas",             // Las Vegas GP
  losail: "lusail",              // Qatar GP
  yas_marina: "yasmarina",       // Abu Dhabi GP
};

export function getCircuitImageUrl(circuitId: string): string | null {
  const slug = CIRCUIT_IMAGE_SLUGS[circuitId];
  if (!slug) return null;
  return `${CDN_BASE}/2026track${slug}blackoutline.svg`;
}
