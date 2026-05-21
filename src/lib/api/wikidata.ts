/**
 * Wikidata / Wikimedia API helpers.
 *
 * All network calls go through `fetchWithTimeout` with a conservative 8-second
 * timeout. Results are cached in-process for 24 h so the dashboard never
 * hammers the public Wikidata API during server-side rendering.
 *
 * Design constraints:
 *  - NO Wikidata calls from client components — always proxied via /api/wikidata.
 *  - Parsers are pure functions (no I/O) so they are trivially testable.
 */

import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";
import { withRetry } from "@/lib/api/retry";
import type { WikidataDriverProfile } from "@/lib/types/wikidata";

// ── Constants ──────────────────────────────────────────────────────────────

const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const COMMONS_THUMB = "https://commons.wikimedia.org/wiki/Special:FilePath";

/** P18 = "image", P19 = "place of birth" (Wikidata property ids) */
const P_IMAGE = "P18";
const P_BIRTH_PLACE = "P19";
/** P405 = sitelinks; used to locate English Wikipedia label */
const SITELINK_EN = "enwiki";

// ── Pure parsers ───────────────────────────────────────────────────────────

/**
 * Extract the raw Wikipedia article title from a full Wikipedia URL.
 * @example "https://en.wikipedia.org/wiki/Lewis_Hamilton" → "Lewis_Hamilton"
 */
export function parseWikipediaTitle(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith("wikipedia.org")) return null;
    const match = u.pathname.match(/^\/wiki\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

/**
 * Extract QID string from a Wikidata entity search result entry.
 * Accepts the array element returned by wbsearchentities.
 */
export function extractQid(entry: unknown): string | null {
  if (
    entry !== null &&
    typeof entry === "object" &&
    "id" in entry &&
    typeof (entry as Record<string, unknown>).id === "string"
  ) {
    const id = (entry as Record<string, unknown>).id as string;
    return /^Q\d+$/.test(id) ? id : null;
  }
  return null;
}

/**
 * Extract the QID of the birthplace from a Wikidata claims object.
 * @param claims - The `claims` field of a wbgetentities result.
 */
export function extractBirthplaceQid(claims: unknown): string | null {
  if (!claims || typeof claims !== "object") return null;
  const c = claims as Record<string, unknown>;
  const birthClaims = c[P_BIRTH_PLACE];
  if (!Array.isArray(birthClaims) || birthClaims.length === 0) return null;
  const first = birthClaims[0] as Record<string, unknown>;
  const mainsnak = first?.mainsnak as Record<string, unknown> | undefined;
  const datavalue = mainsnak?.datavalue as Record<string, unknown> | undefined;
  const value = datavalue?.value as Record<string, unknown> | undefined;
  const id = value?.id;
  return typeof id === "string" && /^Q\d+$/.test(id) ? id : null;
}

/**
 * Extract the Commons filename from Wikidata claims.
 * Returns the raw filename (without "File:" prefix).
 */
export function extractPhotoFilename(claims: unknown): string | null {
  if (!claims || typeof claims !== "object") return null;
  const c = claims as Record<string, unknown>;
  const imageClaims = c[P_IMAGE];
  if (!Array.isArray(imageClaims) || imageClaims.length === 0) return null;
  const first = imageClaims[0] as Record<string, unknown>;
  const mainsnak = first?.mainsnak as Record<string, unknown> | undefined;
  const datavalue = mainsnak?.datavalue as Record<string, unknown> | undefined;
  const value = datavalue?.value;
  return typeof value === "string" ? value : null;
}

/**
 * Extract the English label and optional Wikipedia URL from a place entity.
 */
export function extractPlaceLabelAndWiki(entity: unknown): { label: string | null; wikiUrl: string | null } {
  if (!entity || typeof entity !== "object") return { label: null, wikiUrl: null };
  const e = entity as Record<string, unknown>;

  const labels = e.labels as Record<string, unknown> | undefined;
  const enLabel = labels?.en as Record<string, unknown> | undefined;
  const label = typeof enLabel?.value === "string" ? enLabel.value : null;

  const sitelinks = e.sitelinks as Record<string, unknown> | undefined;
  const enSitelink = sitelinks?.[SITELINK_EN] as Record<string, unknown> | undefined;
  const wikiTitle = typeof enSitelink?.title === "string" ? enSitelink.title : null;
  const wikiUrl = wikiTitle
    ? `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle.replace(/ /g, "_"))}`
    : null;

  return { label, wikiUrl };
}

/**
 * Build a Wikimedia Commons thumbnail URL for a given filename.
 * @param filename - Raw filename as stored in Wikidata (spaces or underscores).
 * @param width - Desired thumbnail width in pixels (default 320).
 */
export function commonsThumbUrl(filename: string, width = 320): string {
  const encoded = encodeURIComponent(filename.replace(/ /g, "_"));
  return `${COMMONS_THUMB}/${encoded}?width=${width}`;
}

// ── Network fetchers ───────────────────────────────────────────────────────

/**
 * Look up the Wikidata QID for an English Wikipedia article title.
 */
export async function fetchQidForTitle(title: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "wbsearchentities",
    search: title,
    language: "en",
    limit: "1",
    format: "json",
    origin: "*",
  });
  return withRetry(async () => {
    const res = await fetchWithTimeout(`${WIKIDATA_API}?${params.toString()}`);
    const data = (await res.json()) as Record<string, unknown>;
    const results = data.search;
    if (!Array.isArray(results) || results.length === 0) return null;
    return extractQid(results[0]);
  });
}

/**
 * Fetch Wikidata claims (properties) for a single QID.
 */
export async function fetchEntityClaims(qid: string): Promise<unknown> {
  const params = new URLSearchParams({
    action: "wbgetentities",
    ids: qid,
    props: "claims|sitelinks",
    format: "json",
    origin: "*",
  });
  return withRetry(async () => {
    const res = await fetchWithTimeout(`${WIKIDATA_API}?${params.toString()}`);
    const data = (await res.json()) as Record<string, unknown>;
    const entities = data.entities as Record<string, unknown> | undefined;
    return entities?.[qid] ?? null;
  });
}

/**
 * Fetch labels and sitelinks for a Wikidata place entity.
 */
export async function fetchPlaceEntity(qid: string): Promise<unknown> {
  const params = new URLSearchParams({
    action: "wbgetentities",
    ids: qid,
    props: "labels|sitelinks",
    languages: "en",
    format: "json",
    origin: "*",
  });
  return withRetry(async () => {
    const res = await fetchWithTimeout(`${WIKIDATA_API}?${params.toString()}`);
    const data = (await res.json()) as Record<string, unknown>;
    const entities = data.entities as Record<string, unknown> | undefined;
    return entities?.[qid] ?? null;
  });
}

/**
 * Full pipeline: Wikipedia URL → WikidataDriverProfile.
 * Returns null for each field independently if not available.
 */
export async function fetchWikidataDriverProfile(
  wikipediaUrl: string
): Promise<WikidataDriverProfile | null> {
  const title = parseWikipediaTitle(wikipediaUrl);
  if (!title) return null;

  const qid = await fetchQidForTitle(title);
  if (!qid) return null;

  const entity = await fetchEntityClaims(qid);
  if (!entity || typeof entity !== "object") return { qid, birthplaceCity: null, birthplaceWikipediaUrl: null, photoUrl: null };

  const claims = (entity as Record<string, unknown>).claims;

  const birthplaceQid = extractBirthplaceQid(claims);
  const photoFilename = extractPhotoFilename(claims);

  let birthplaceCity: string | null = null;
  let birthplaceWikipediaUrl: string | null = null;

  if (birthplaceQid) {
    try {
      const place = await fetchPlaceEntity(birthplaceQid);
      const { label, wikiUrl } = extractPlaceLabelAndWiki(place);
      birthplaceCity = label;
      birthplaceWikipediaUrl = wikiUrl;
    } catch {
      // Best-effort — leave null
    }
  }

  const photoUrl = photoFilename ? commonsThumbUrl(photoFilename) : null;

  return { qid, birthplaceCity, birthplaceWikipediaUrl, photoUrl };
}

// ── Cache wrapper ──────────────────────────────────────────────────────────

const profileCache = new Map<string, { value: WikidataDriverProfile | null; expiry: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Cache-wrapped version of fetchWikidataDriverProfile.
 * Keyed by the full Wikipedia URL.
 */
export async function getWikidataDriverProfile(
  wikipediaUrl: string
): Promise<WikidataDriverProfile | null> {
  const now = Date.now();
  const cached = profileCache.get(wikipediaUrl);
  if (cached && cached.expiry > now) return cached.value;

  const value = await fetchWikidataDriverProfile(wikipediaUrl);
  profileCache.set(wikipediaUrl, { value, expiry: now + CACHE_TTL_MS });
  return value;
}
