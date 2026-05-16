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

const CIRCUIT_IMAGE_NAMES: Record<string, string> = {
  Bahrain: "Bahrain",
  "Saudi Arabia": "Saudi_Arabia",
  Australia: "Australia",
  Japan: "Japan",
  China: "China",
  Miami: "Miami",
  "Emilia Romagna": "Emilia_Romagna",
  Monaco: "Monaco",
  Canada: "Canada",
  Spain: "Spain",
  Austria: "Austria",
  "Great Britain": "Great_Britain",
  Hungary: "Hungary",
  Belgium: "Belgium",
  Netherlands: "Netherlands",
  Italy: "Italy",
  Azerbaijan: "Azerbaijan",
  Singapore: "Singapore",
  "United States": "USA",
  Mexico: "Mexico",
  Brazil: "Brazil",
  "Las Vegas": "Las_Vegas",
  Qatar: "Qatar",
  "Abu Dhabi": "Abu_Dhabi",
};

export function getCircuitImageUrl(country: string): string | null {
  const name = CIRCUIT_IMAGE_NAMES[country];
  if (!name) return null;
  return `https://media.formula1.com/image/upload/f_auto/q_auto/v0/fom-website/2018-redesign-assets/Track%20icons%20(1x1)/${name}_Circuit.png`;
}
