import { NextResponse } from "next/server";
import { fetchNewsFeeds } from "@/lib/api/rss";

export const revalidate = 900; // 15 minutes

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter")?.toLowerCase(); // upgrades | next race | etc.

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
    return NextResponse.json(
      { error: "News fetch failed", detail: String(err) },
      { status: 500 }
    );
  }
}
