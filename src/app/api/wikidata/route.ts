import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_WIKI_TITLE } from "@/lib/validators";
import { getWikidataDriverProfile } from "@/lib/api/wikidata";
import { parseWikipediaTitle } from "@/lib/api/wikidata";

export const revalidate = 86400;

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
    const profile = await getWikidataDriverProfile(wikiUrl);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (err) {
    return serverError("wikidata", err);
  }
}
