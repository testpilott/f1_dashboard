import { NextResponse } from "next/server";
import { TEAM_LOGOS } from "@/lib/constants";

/**
 * Proxies team logo images through our server to avoid Wikipedia's
 * cross-origin / hotlink restrictions that block browser requests.
 * Cached for 24 h on the CDN / Next.js edge cache.
 *
 * GET /api/logo?team=Ferrari
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const team = searchParams.get("team");

  if (!team) {
    return NextResponse.json({ error: "team param required" }, { status: 400 });
  }

  const logoUrl = TEAM_LOGOS[team];
  if (!logoUrl) {
    return NextResponse.json({ error: "unknown team" }, { status: 404 });
  }

  let resp: Response;
  try {
    resp = await fetch(logoUrl, {
      headers: {
        // Mimic a regular browser request so Wikipedia doesn't 429/block us
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: "https://en.wikipedia.org/",
        Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
      },
      // Next.js server-side cache — don't re-fetch for 24 h
      next: { revalidate: 86400 },
    });
  } catch {
    return NextResponse.json({ error: "upstream fetch failed" }, { status: 502 });
  }

  if (!resp.ok) {
    return NextResponse.json(
      { error: `upstream ${resp.status}` },
      { status: 502 }
    );
  }

  const buffer = await resp.arrayBuffer();
  const contentType = resp.headers.get("content-type") ?? "image/png";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      // Client-side cache: 24 h fresh, serve stale for 1 h while revalidating
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
    },
  });
}
