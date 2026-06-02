import { type DataClass, adaptiveRevalidate } from "@/lib/cacheStrategy";

const STALE_WHILE_REVALIDATE = 7 * 24 * 3600; // 7 days

/**
 * Returns a `Cache-Control` header value for CDN/edge caching appropriate
 * to the given DataClass. Allows serving stale data for up to 7 days while
 * a revalidation request is in flight.
 */
export function edgeCacheControl(dataClass: DataClass): string {
  const maxAge = adaptiveRevalidate(dataClass);
  return `public, s-maxage=${maxAge}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`;
}
