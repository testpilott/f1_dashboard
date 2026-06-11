import { fetchNewsFeeds } from "@/lib/api/rss";
import { serverError, cachedJson } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";

export const revalidate = 900; // 15 minutes

export async function GET(req: Request) {
  const blocked = rateLimited(req, "news");
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  // Only allow plain text filters — no regex injection possible since we use .includes()
  const filter = searchParams.get("filter")?.toLowerCase().slice(0, 100);

  try {
    // When filtering by a specific term (e.g. driver name), fetch more items per feed
    // so there's a larger pool to search through before the per-term articles are found.
    let items = await fetchNewsFeeds(filter ? 30 : 20);
    if (filter) {
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(filter) ||
          item.contentSnippet?.toLowerCase().includes(filter)
      );
    }
    return cachedJson({ items: items.slice(0, 50) }, "newsFeed");
  } catch (err) {
    return serverError("news", err);
  }
}
