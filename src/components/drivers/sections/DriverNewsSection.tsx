import { formatDistanceToNow } from "date-fns";
import { ExternalLink } from "lucide-react";
import type { NewsItem } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function DriverNewsSection({
  news,
  newsLoading,
}: {
  news?: NewsItem[];
  newsLoading: boolean;
}) {
  return (
    <div className="px-5 py-3.5">
      <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Latest News
      </h3>

      {newsLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-11 rounded" />
          ))}
        </div>
      )}

      {!newsLoading && (!news || news.length === 0) && (
        <p className="text-xs text-muted-foreground">No recent news found.</p>
      )}

      {news && news.length > 0 && (
        <ul className="space-y-3">
          {news.slice(0, 10).map((item, i) => (
            <li key={i}>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-1.5"
              >
                <span className="text-sm text-foreground/80 group-hover:text-foreground line-clamp-2 leading-snug transition-colors flex-1">
                  {item.title}
                </span>
                <ExternalLink
                  size={11}
                  className="text-muted-foreground/50 group-hover:text-muted-foreground shrink-0 mt-0.5 transition-colors"
                />
              </a>
              {item.pubDate && !isNaN(new Date(item.pubDate).getTime()) && (
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                  {formatDistanceToNow(new Date(item.pubDate), { addSuffix: true })}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
