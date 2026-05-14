import Parser from "rss-parser";
import type { NewsItem } from "@/lib/types";
import { NEWS_FEEDS } from "@/lib/constants";

const parser = new Parser({
  customFields: {
    item: ["media:content", "media:thumbnail", "enclosure"],
  },
});

export async function fetchNewsFeeds(maxPerFeed = 15): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    NEWS_FEEDS.map(async (feed) => {
      const rss = await parser.parseURL(feed.url);
      return rss.items.slice(0, maxPerFeed).map((item): NewsItem => ({
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

  // Sort by date descending
  return items.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );
}
