"use client";

import { useState, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DriverStanding, NewsItem } from "@/lib/types";
import { getTeamColor, getFlag } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import TeamLogo from "@/components/ui/TeamLogo";
import { getDriverStatic } from "@/lib/drivers-static";
import { formatDistanceToNow } from "date-fns";
import { X, MapPin, Radio, Zap, ExternalLink } from "lucide-react";

async function fetchStandings() {
  const res = await fetch("/api/standings?season=current");
  if (!res.ok) throw new Error("Failed to load standings");
  const d = await res.json();
  return (Array.isArray(d.drivers) ? d.drivers : []) as DriverStanding[];
}

async function fetchDriverNews(lastName: string): Promise<NewsItem[]> {
  const res = await fetch(`/api/news?filter=${encodeURIComponent(lastName.toLowerCase())}`);
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d.items) ? d.items : [];
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DriversPage() {
  const [selected, setSelected] = useState<DriverStanding | null>(null);

  // Distinct key from StandingsTables (["standings", season]) to avoid cache shape mismatch.
  // StandingsTables caches { drivers, constructors }; this page expects DriverStanding[].
  const { data: drivers, isLoading, isError } = useQuery({
    queryKey: ["driver-standings", "current"],
    queryFn: fetchStandings,
    staleTime: 5 * 60 * 1000,
  });

  const { data: news, isLoading: newsLoading } = useQuery({
    queryKey: ["driver-news", selected?.Driver.familyName],
    queryFn: () => fetchDriverNews(selected!.Driver.familyName),
    enabled: !!selected,
    staleTime: 15 * 60 * 1000,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">2026 Drivers</h1>

      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        {/* ── Driver grid ── */}
        <div
          className={`grid gap-3 grid-cols-1 ${
            selected ? "lg:grid-cols-2 lg:flex-1 lg:min-w-0" : "w-full lg:grid-cols-3"
          }`}
        >
          {isLoading &&
            Array.from({ length: 20 }).map((_, i) => (
              <Skeleton key={i} className="h-24 bg-zinc-800 rounded-lg" />
            ))}

          {isError && (
            <p className="text-zinc-500 text-sm col-span-full">Failed to load drivers. Please try again.</p>
          )}

          {drivers?.map((d) => {
            const team = d.Constructors[0]?.name ?? "Unknown";
            const color = getTeamColor(team);
            const pos = parseInt(d.position, 10);
            const isActive = selected?.Driver.driverId === d.Driver.driverId;

            return (
              <Fragment key={d.Driver.driverId}>
                <button
                  onClick={() => setSelected(isActive ? null : d)}
                  className={`rounded-lg border p-4 flex items-center gap-4 transition-all text-left w-full cursor-pointer ${
                    isActive
                      ? "bg-zinc-800 border-zinc-600 ring-1 ring-zinc-600"
                      : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/80"
                  }`}
                  style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                >
                <div className="text-3xl font-black text-zinc-700 w-8 text-center tabular-nums shrink-0">
                  {pos}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <TeamLogo team={team} size={20} />
                    <span className="font-mono text-xs font-bold" style={{ color }}>
                      {d.Driver.code}
                    </span>
                    {d.wins !== "0" && (
                      <Badge className="bg-yellow-900/40 text-yellow-400 border-yellow-900 text-[10px] px-1">
                        {d.wins}W
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium truncate">
                    {d.Driver.givenName} {d.Driver.familyName}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">{team}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold font-mono text-lg">{d.points}</p>
                  <p className="text-[10px] text-zinc-600">pts</p>
                </div>
                </button>
                {/* Mobile inline detail panel — shown directly below selected driver on small screens */}
                {isActive && (
                  <div className="lg:hidden">
                    <DriverDetailPanel
                      driver={d}
                      news={news}
                      newsLoading={newsLoading}
                      onClose={() => setSelected(null)}
                    />
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>

        {/* ── Desktop sidebar detail panel ── */}
        {selected && (
          <div className="hidden lg:block lg:w-[380px] lg:shrink-0 lg:sticky lg:top-4">
            <DriverDetailPanel
              driver={selected}
              news={news}
              newsLoading={newsLoading}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Driver detail panel ──────────────────────────────────────────────────────

function DriverDetailPanel({
  driver,
  news,
  newsLoading,
  onClose,
}: {
  driver: DriverStanding;
  news?: NewsItem[];
  newsLoading: boolean;
  onClose: () => void;
}) {
  const team = driver.Constructors[0]?.name ?? "Unknown";
  const color = getTeamColor(team);
  const pos = parseInt(driver.position, 10);

  const age =
    driver.Driver.dateOfBirth
      ? Math.floor(
          (Date.now() - new Date(driver.Driver.dateOfBirth).getTime()) /
            (1000 * 60 * 60 * 24 * 365.25)
        )
      : null;

  const flag = getFlag(driver.Driver.nationality);
  const staticData = getDriverStatic(driver.Driver.driverId);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* ── Coloured header bar ── */}
      <div className="h-1 w-full" style={{ backgroundColor: color }} />

      {/* ── Header ── */}
      <div className="relative p-5 pb-4">
        <button
          onClick={onClose}
          aria-label="Close driver detail"
          className="absolute top-3 right-3 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
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
              <span className="text-zinc-600 text-sm">#{driver.Driver.permanentNumber}</span>
            </div>
            <h2 className="text-lg font-bold leading-tight">
              {driver.Driver.givenName} {driver.Driver.familyName}
            </h2>
            <p className="text-sm text-zinc-400">{team}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Position" value={`P${pos}`} />
          <StatBox label="Points" value={driver.points} />
          <StatBox label="Wins" value={driver.wins} highlight={driver.wins !== "0"} />
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="overflow-y-auto max-h-[calc(100vh-320px)] divide-y divide-zinc-800/60">
        {/* Bio */}
        <div className="px-5 py-3.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-sm text-zinc-300">
            <MapPin size={13} className="text-zinc-500 shrink-0" />
            <span>
              {flag} {driver.Driver.nationality}
            </span>
            {age !== null && (
              <span className="text-zinc-500 ml-1">· Age {age}</span>
            )}
          </div>
          {staticData?.hometown && (
            <p className="text-xs text-zinc-500 pl-5">{staticData.hometown}</p>
          )}
        </div>

        {/* Driving style */}
        {staticData?.style && (
          <div className="px-5 py-3.5">
            <div className="flex items-center gap-1.5 mb-2">
              <Zap size={13} className="text-yellow-500 shrink-0" />
              <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Driving Style
              </h3>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">{staticData.style}</p>
          </div>
        )}

        {/* Memorable Quotes carousel */}
        {staticData?.quotes && staticData.quotes.length > 0 && (
          <div className="py-3.5">
            <div className="flex items-center gap-1.5 mb-3 px-5">
              <Radio size={13} className="text-green-500 shrink-0" />
              <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Memorable Quotes
              </h3>
            </div>
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 px-5">
              {staticData.quotes.map((quote, i) => (
                <div
                  key={i}
                  className="min-w-[220px] max-w-[260px] snap-start flex-shrink-0 bg-zinc-800/60 rounded-lg p-3"
                >
                  <blockquote
                    className="text-sm text-zinc-200 italic border-l-2 pl-3 leading-relaxed"
                    style={{ borderLeftColor: color }}
                  >
                    &ldquo;{quote.text}&rdquo;
                  </blockquote>
                  <p className="text-[10px] text-zinc-500 pl-3 mt-1.5">
                    — {quote.source.race} &middot; {quote.source.year}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Latest news */}
        <div className="px-5 py-3.5">
          <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Latest News
          </h3>

          {newsLoading && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-11 bg-zinc-800 rounded" />
              ))}
            </div>
          )}

          {!newsLoading && (!news || news.length === 0) && (
            <p className="text-xs text-zinc-500">No recent news found.</p>
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
                    <span className="text-sm text-zinc-300 group-hover:text-zinc-100 line-clamp-2 leading-snug transition-colors flex-1">
                      {item.title}
                    </span>
                    <ExternalLink
                      size={11}
                      className="text-zinc-600 group-hover:text-zinc-400 shrink-0 mt-0.5 transition-colors"
                    />
                  </a>
                  {item.pubDate && (
                    <p className="text-[10px] text-zinc-600 mt-0.5">
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBox({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-zinc-800/60 rounded-lg p-2.5 text-center">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-lg font-black font-mono ${highlight ? "text-yellow-400" : ""}`}>
        {value}
      </p>
    </div>
  );
}

