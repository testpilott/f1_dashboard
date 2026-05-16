import { NextResponse } from "next/server";
import { fetchNewsFeeds } from "@/lib/api/rss";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

export const revalidate = 900; // 15 minutes

export async function GET(req: Request) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`news:${ip}`, 60_000, 60)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const { searchParams } = new URL(req.url);
  // Only allow plain text filters — no regex injection possible since we use .includes()
  const filter = searchParams.get("filter")?.toLowerCase().slice(0, 100);

  try {
    let items = await fetchNewsFeeds(20);
    if (filter) {
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(filter) ||
          item.contentSnippet?.toLowerCase().includes(filter)
      );
    }
    return NextResponse.json({ items: items.slice(0, 50) });
  } catch (err) {
    console.error("[/api/news] Error:", err);
    return NextResponse.json({ error: "News fetch failed" }, { status: 500 });
  }
}
