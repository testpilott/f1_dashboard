"use client";

import { useQuery } from "@tanstack/react-query";
import type { NewsItem } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

async function fetchNews(filter?: string) {
  const url = filter ? `/api/news?filter=${encodeURIComponent(filter)}` : "/api/news";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed");
  return res.json().then((d) => (Array.isArray(d.items) ? d.items : []) as NewsItem[]);
}

const FILTERS = [
  "", "verstappen", "norris", "leclerc", "piastri", "russell",
  "hamilton", "sainz", "alonso", "upgrade", "tyre", "crash",
];
const FILTER_LABELS: Record<string, string> = {
  "": "All",
  verstappen: "Verstappen",
  norris: "Norris",
  leclerc: "Leclerc",
  piastri: "Piastri",
  russell: "Russell",
  hamilton: "Hamilton",
  sainz: "Sainz",
  alonso: "Alonso",
  upgrade: "Upgrades",
  tyre: "Tyres",
  crash: "Incidents",
};

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
          {FILTERS.map((f) => (
            <button
              key={f || "all"}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-red-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full bg-zinc-800" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-zinc-500 text-sm py-8 text-center">
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
              className="flex items-start gap-3 p-4 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-[10px] px-1.5 py-0">
                    {item.source}
                  </Badge>
                  {item.pubDate && (() => {
                    try {
                      return (
                        <span className="text-[10px] text-zinc-600">
                          {formatDistanceToNow(new Date(item.pubDate), { addSuffix: true })}
                        </span>
                      );
                    } catch {
                      return null;
                    }
                  })()}
                </div>
                <p className="text-sm font-medium line-clamp-2 group-hover:text-white transition-colors">
                  {item.title}
                </p>
                {item.contentSnippet && (
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{item.contentSnippet}</p>
                )}
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-600 shrink-0 mt-0.5 group-hover:text-zinc-400 transition-colors" />
            </a>
          ))}
          {items.length === 0 && (
            <p className="text-zinc-500 text-sm">No articles found for this filter.</p>
          )}
        </div>
      )}
    </div>
  );
}
