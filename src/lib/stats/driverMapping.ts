import type { OpenF1Driver } from "@/lib/types";

interface JolpicaDriverRef {
  driverId: string;
  code: string;
  familyName: string;
}

/**
 * Match an OpenF1 driver entry to a Jolpica driver reference.
 * Priority:
 *   1. name_acronym equals code (case-insensitive)
 *   2. last_name equals familyName (case-insensitive, trimmed)
 *   3. null
 */
export function matchOpenF1Driver(
  openF1Drivers: OpenF1Driver[],
  jolpica: JolpicaDriverRef,
): OpenF1Driver | null {
  if (!Array.isArray(openF1Drivers) || openF1Drivers.length === 0) return null;

  const code = jolpica.code?.trim().toLowerCase() ?? "";
  const familyName = jolpica.familyName?.trim().toLowerCase() ?? "";

  // Pass 1: acronym match
  for (const d of openF1Drivers) {
    if ((d.name_acronym ?? "").trim().toLowerCase() === code) return d;
  }

  // Pass 2: family name fallback
  for (const d of openF1Drivers) {
    if ((d.last_name ?? "").trim().toLowerCase() === familyName) return d;
  }

  return null;
}
