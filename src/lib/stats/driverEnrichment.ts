import type { WikidataDriverProfile } from "@/lib/types/wikidata";

/**
 * Choose best available birthplace data.
 * Priority: Wikidata city+url -> static hometown city part -> null.
 */
export function resolveBirthplace(
  wikidata: WikidataDriverProfile | null,
  staticHometown: string | null,
): { city: string | null; wikiUrl: string | null } {
  if (wikidata?.birthplaceCity) {
    return {
      city: wikidata.birthplaceCity,
      wikiUrl: wikidata.birthplaceWikipediaUrl,
    };
  }

  if (staticHometown) {
    const city = staticHometown.split(",")[0]?.trim() ?? "";
    return { city: city || null, wikiUrl: null };
  }

  return { city: null, wikiUrl: null };
}

/**
 * Best available photo URL.
 * Priority: Wikidata photo -> null.
 */
export function resolvePhotoUrl(wikidata: WikidataDriverProfile | null): string | null {
  return wikidata?.photoUrl ?? null;
}
