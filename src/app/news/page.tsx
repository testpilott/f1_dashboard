"use client";

import { useQuery } from "@tanstack/react-query";
import type { NewsItem } from "@/lib/types";
import { fetchJson } from "@/lib/api/clientFetch";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

async function fetchNews(filter?: string) {
  const url = filter ? `/api/news?filter=${encodeURIComponent(filter)}` : "/api/news";
  const d = await fetchJson<{ items?: NewsItem[] }>(url);
  return (Array.isArray(d.items) ? d.items : []) as NewsItem[];
}

const NEWS_FILTERS = [
  { id: "", label: "All" },
  { id: "verstappen", label: "Verstappen" },
  { id: "norris", label: "Norris" },
  { id: "leclerc", label: "Leclerc" },
  { id: "piastri", label: "Piastri" },
  { id: "russell", label: "Russell" },
  { id: "hamilton", label: "Hamilton" },
  { id: "sainz", label: "Sainz" },
  { id: "alonso", label: "Alonso" },
  { id: "upgrade", label: "Upgrades" },
  { id: "tyre", label: "Tyres" },
  { id: "crash", label: "Incidents" },
] as const;

export default function NewsPage() {
  const [filter, setFilter] = useState("");

  const { data: items, isLoading, isError } = useQuery({
    queryKey: ["news", filter],
    queryFn: () => fetchNews(filter || undefined),
    staleTime: 15 * 60 * 1000,
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <h1 className="text-2xl font-bold">F1 News</h1>
        <div className="flex flex-wrap gap-1.5">
          {NEWS_FILTERS.map(({ id, label }) => (
            <button
              key={id || "all"}
              onClick={() => setFilter(id)}
              aria-pressed={filter === id}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === id
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-3 text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-muted-foreground text-sm py-8 text-center">
          Failed to load news. Please refresh to try again.
        </p>
      )}

      {items && (
        <div className="space-y-2">
          {items.map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-4 rounded-lg bg-surface-2 border border-border hover:bg-accent transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge className="bg-surface-3 text-muted-foreground border-border text-[10px] px-1.5 py-0">
                    {item.source}
                  </Badge>
                  {item.pubDate && (() => {
                    try {
                      return (
                        <span className="text-[10px] text-muted-foreground/50">
                          {formatDistanceToNow(new Date(item.pubDate), { addSuffix: true })}
                        </span>
                      );
                    } catch {
                      return null;
                    }
                  })()}
                </div>
                <p className="text-sm font-medium line-clamp-2 group-hover:text-foreground transition-colors">
                  {item.title}
                </p>
                {item.contentSnippet && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.contentSnippet}</p>
                )}
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 mt-0.5 group-hover:text-muted-foreground transition-colors" />
            </a>
          ))}
          {items.length === 0 && (
            <p className="text-muted-foreground text-sm">No articles found for this filter.</p>
          )}
        </div>
      )}
    </div>
  );
}
