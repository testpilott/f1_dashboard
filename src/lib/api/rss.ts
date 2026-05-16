import Parser from "rss-parser";
import type { NewsItem } from "@/lib/types";
import { NEWS_FEEDS } from "@/lib/constants";

const parser = new Parser({
  timeout: 5000,
  customFields: {
    item: ["media:content", "media:thumbnail", "enclosure"],
  },
});

export async function fetchNewsFeeds(maxPerFeed = 15): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    NEWS_FEEDS.map(async (feed) => {
      const rss = await parser.parseURL(feed.url);
      return (rss.items ?? []).slice(0, maxPerFeed).map((item): NewsItem => ({
        title: item.title ?? "Untitled",
        link: item.link ?? "#",
        pubDate: item.pubDate ?? new Date().toISOString(),
        contentSnippet: item.contentSnippet ?? item.summary,
        source: feed.name,
        categories: item.categories,
      }));
    })
  );

  const items: NewsItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    }
  }

  // Deduplicate by URL — the same story can be syndicated across multiple feeds
  const seen = new Set<string>();
  const unique = items.filter((item) => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });

  // Sort by date descending — guard against unparseable pubDate values
  return unique.sort((a, b) => {
    const aTime = new Date(a.pubDate).getTime();
    const bTime = new Date(b.pubDate).getTime();
    return (isNaN(bTime) ? 0 : bTime) - (isNaN(aTime) ? 0 : aTime);
  });
}
