import { unstable_cache } from "next/cache";
import { badRequest, notFound, serverError, cachedJson } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_WIKI_TITLE } from "@/lib/validators";
import { getWikidataDriverProfile } from "@/lib/api/wikidata";
import { parseWikipediaTitle } from "@/lib/api/wikidata";
import { currentEtWeekBucket, WEEKLY_CACHE_REVALIDATE_SECONDS } from "@/lib/time/weeklyCache";

export const revalidate = 604800;

const getCachedWikidataProfile = unstable_cache(
  async (wikiUrl: string, _unusedWeekBucket: string) => {
    void _unusedWeekBucket;
    return getWikidataDriverProfile(wikiUrl);
  },
  ["wikidata-v2-weekly"],
  { revalidate: WEEKLY_CACHE_REVALIDATE_SECONDS, tags: ["wikidata"] }
);

export async function GET(req: Request) {
  const blocked = rateLimited(req, "wikidata");
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const wikiUrl = searchParams.get("wikiUrl") ?? "";

  if (!wikiUrl) {
    return badRequest("Missing required parameter: wikiUrl");
  }

  // Validate that the URL resolves to a safe Wikipedia title
  const title = parseWikipediaTitle(wikiUrl);
  if (!title || !VALID_WIKI_TITLE.test(title)) {
    return badRequest("Invalid wikiUrl: must be an English Wikipedia article URL");
  }

  try {
    const weekBucket = currentEtWeekBucket();
    const profile = await getCachedWikidataProfile(wikiUrl, weekBucket);
    if (!profile) {
      return notFound("Profile not found");
    }
    return cachedJson(profile, "socialBio");
  } catch (err) {
    return serverError("wikidata", err);
  }
}
