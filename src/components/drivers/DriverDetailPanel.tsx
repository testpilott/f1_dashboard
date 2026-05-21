"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { X, MapPin, Radio, Zap, ExternalLink } from "lucide-react";
import type { DriverStanding, NewsItem } from "@/lib/types";
import type { DriverSeasonSummary } from "@/lib/stats/driverSeason";
import { getTeamColor, getFlag } from "@/lib/constants";
import { getDriverStatic } from "@/lib/drivers-static";
import { DriverSeasonStats } from "@/components/stats/DriverSeasonStats";
import { Skeleton } from "@/components/ui/skeleton";
import TeamLogo from "@/components/ui/TeamLogo";
import StatBox from "@/components/drivers/StatBox";
import { ageFromDateOfBirth } from "@/lib/stats/age";

export type DriverSeasonData = {
  season: string;
  driverId: string;
  summary: DriverSeasonSummary;
};

type DriverCareerStats = import("@/lib/stats/driverCareer").DriverCareerStats;

export default function DriverDetailPanel({
  driver,
  news,
  newsLoading,
  seasonStats,
  seasonLoading,
  careerData,
  careerLoading,
  onClose,
}: {
  driver: DriverStanding;
  news?: NewsItem[];
  newsLoading: boolean;
  seasonStats?: DriverSeasonData;
  seasonLoading: boolean;
  careerData?: DriverCareerStats;
  careerLoading: boolean;
  onClose: () => void;
}) {
  const team = driver.Constructors[0]?.name ?? "Unknown";
  const color = getTeamColor(team);
  const pos = parseInt(driver.position, 10);

  const [now] = useState(() => new Date());
  const age = driver.Driver.dateOfBirth ? ageFromDateOfBirth(driver.Driver.dateOfBirth, now) : null;

  const flag = getFlag(driver.Driver.nationality);
  const staticData = getDriverStatic(driver.Driver.driverId);

  return (
    <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
      <div className="h-1 w-full" style={{ backgroundColor: color }} />

      <div className="relative p-5 pb-4">
        <button
          onClick={onClose}
          aria-label="Close driver detail"
          className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <TeamLogo team={team} size={36} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold" style={{ color }}>
                {driver.Driver.code}
              </span>
              <span className="text-muted-foreground/50 text-sm">#{driver.Driver.permanentNumber}</span>
            </div>
            <h2 className="text-lg font-bold leading-tight">
              {driver.Driver.givenName} {driver.Driver.familyName}
            </h2>
            <p className="text-sm text-muted-foreground">{team}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Position" value={`P${pos}`} />
          <StatBox label="Points" value={driver.points} />
          <StatBox label="Wins" value={driver.wins} highlight={driver.wins !== "0"} />
        </div>
      </div>

      <div className="overflow-y-auto max-h-[calc(100vh-320px)] divide-y divide-border/60">
        <div className="px-5 py-3.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-sm text-foreground/80">
            <MapPin size={13} className="text-muted-foreground/50 shrink-0" />
            <span>
              {flag} {driver.Driver.nationality}
            </span>
            {age !== null && (
              <span className="text-muted-foreground ml-1">· Age {age}</span>
            )}
          </div>
          {staticData?.hometown && (
            <p className="text-xs text-muted-foreground pl-5">{staticData.hometown}</p>
          )}
        </div>

        {staticData?.style && (
          <div className="px-5 py-3.5">
            <div className="flex items-center gap-1.5 mb-2">
              <Zap size={13} className="text-medal-gold shrink-0" />
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Driving Style
              </h3>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{staticData.style}</p>
          </div>
        )}

        {staticData?.quotes && staticData.quotes.length > 0 && (
          <div className="py-3.5">
            <div className="flex items-center gap-1.5 mb-3 px-5">
              <Radio size={13} className="text-chart-5 shrink-0" />
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Memorable Quotes
              </h3>
            </div>
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 px-5">
              {staticData.quotes.map((quote, i) => (
                <div
                  key={i}
                  className="min-w-[220px] max-w-[260px] snap-start flex-shrink-0 bg-surface-3/60 rounded-lg p-3"
                >
                  <blockquote
                    className="text-sm text-foreground/90 italic border-l-2 pl-3 leading-relaxed"
                    style={{ borderLeftColor: color }}
                  >
                    &ldquo;{quote.text}&rdquo;
                  </blockquote>
                  <p className="text-[10px] text-muted-foreground pl-3 mt-1.5">
                    — {quote.source.race} · {quote.source.year}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-5 py-3.5">
          <div className="flex items-center gap-1.5 mb-3">
            <Zap size={13} className="text-[var(--f1-red)] shrink-0" />
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              This Season
            </h3>
          </div>
          {seasonLoading && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          )}
          {seasonStats?.summary && (
            <DriverSeasonStats summary={seasonStats.summary} />
          )}
        </div>

        <div className="px-5 py-3.5">
          <div className="flex items-center gap-1.5 mb-3">
            <Zap size={13} className="text-chart-5 shrink-0" />
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Career
            </h3>
          </div>
          {careerLoading && (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          )}
          {careerData && (
            <div className="grid grid-cols-3 gap-2">
              <StatBox label="Starts" value={String(careerData.starts)} />
              <StatBox label="Wins" value={String(careerData.wins)} highlight={careerData.wins > 0} />
              <StatBox label="Podiums" value={String(careerData.podiums)} highlight={careerData.podiums > 0} />
              <StatBox label="Fastest" value={String(careerData.fastestLaps)} />
              <StatBox label="Champs" value={careerData.championships > 0 ? String(careerData.championships) : "—"} highlight={careerData.championships > 0} />
            </div>
          )}
        </div>

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
      </div>
    </div>
  );
}