import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(() => null),
}));

vi.mock("@/lib/api/rss", () => ({
  fetchNewsFeeds: vi.fn(),
}));

import { GET } from "@/app/api/news/route";
import { fetchNewsFeeds } from "@/lib/api/rss";
import { makeApiRequest } from "@/test/api";

const ITEMS = [
  {
    title: "Verstappen wins Bahrain",
    link: "https://example.com/1",
    pubDate: "2026-03-08T17:00:00Z",
    contentSnippet: "Max takes the opener.",
    source: "Test Feed",
  },
  {
    title: "Hamilton on the podium",
    link: "https://example.com/2",
    pubDate: "2026-03-08T17:30:00Z",
    contentSnippet: "Lewis on the rostrum.",
    source: "Test Feed",
  },
];

describe("GET /api/news", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with items when feeds succeed", async () => {
    vi.mocked(fetchNewsFeeds).mockResolvedValue(ITEMS as never);
    const res = await GET(makeApiRequest("/api/news"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(2);
    expect(fetchNewsFeeds).toHaveBeenCalledWith(20);
  });

  it("requests a larger pool and filters when a filter is provided", async () => {
    vi.mocked(fetchNewsFeeds).mockResolvedValue(ITEMS as never);
    const res = await GET(makeApiRequest("/api/news", { filter: "hamilton" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(fetchNewsFeeds).toHaveBeenCalledWith(30);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].title).toMatch(/hamilton/i);
  });

  it("returns 500 when the feed aggregator throws", async () => {
    vi.mocked(fetchNewsFeeds).mockRejectedValue(new Error("network"));
    const res = await GET(makeApiRequest("/api/news"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/internal server error/i);
  });
});
