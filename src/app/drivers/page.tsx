"use client";

import { useState, Fragment } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import type { DriverStanding, NewsItem } from "@/lib/types";
import { getTeamColor, getFlag } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import TeamLogo from "@/components/ui/TeamLogo";
import { getDriverStatic } from "@/lib/drivers-static";
import { formatDistanceToNow } from "date-fns";
import { X, MapPin, Radio, Zap, ExternalLink } from "lucide-react";
import { matchOpenF1Driver } from "@/lib/stats/driverMapping";
import { DriverSeasonStats } from "@/components/stats/DriverSeasonStats";
import type { DriverSeasonSummary } from "@/lib/stats/driverSeason";

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

type DriverPhotoEntry = {
  driver_number: number;
  name_acronym: string;
  last_name: string;
  headshot_url: string | null;
};

type DriverSeasonData = {
  season: string;
  driverId: string;
  summary: DriverSeasonSummary;
};

async function fetchDriverPhotos(): Promise<DriverPhotoEntry[]> {
  const res = await fetch("/api/driver-photos");
  if (!res.ok) return [];
  const d = await res.json();
  return Array.isArray(d.photos) ? d.photos : [];
}

async function fetchDriverSeason(driverId: string): Promise<DriverSeasonData> {
  const res = await fetch(`/api/driver-season?season=current&driverId=${encodeURIComponent(driverId)}`);
  if (!res.ok) throw new Error("Failed to load season stats");
  return res.json() as Promise<DriverSeasonData>;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DriversPage() {
  const [selected, setSelected] = useState<DriverStanding | null>(null);

  // Distinct key from StandingsTables (["standings", season]) to avoid cache shape mismatch.
  // StandingsTables caches { drivers, constructors }; this page expects DriverStanding[].
  const { data: drivers, isLoading, isError, refetch } = useQuery({
    queryKey: ["driver-standings", "current"],
    queryFn: fetchStandings,
    staleTime: 5 * 60 * 1000,
  });

  const { data: photos } = useQuery({
    queryKey: ["driver-photos"],
    queryFn: fetchDriverPhotos,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { data: news, isLoading: newsLoading } = useQuery({
    queryKey: ["driver-news", selected?.Driver.familyName],
    queryFn: () => fetchDriverNews(selected!.Driver.familyName),
    enabled: !!selected,
    staleTime: 15 * 60 * 1000,
  });

  const { data: seasonStats, isLoading: seasonLoading } = useQuery({
    queryKey: ["driver-season", "current", selected?.Driver.driverId],
    queryFn: () => fetchDriverSeason(selected!.Driver.driverId),
    enabled: !!selected,
    staleTime: 60 * 60 * 1000,
  });

  const { data: careerData, isLoading: careerLoading } = useQuery({
    queryKey: ["driver-career", selected?.Driver.driverId],
    queryFn: () =>
      fetch(`/api/driver-career?driverId=${encodeURIComponent(selected!.Driver.driverId)}`)
        .then((r) => r.json()) as Promise<{ driverId: string; career: import("@/lib/stats/driverCareer").DriverCareerStats }>,
    enabled: !!selected,
    staleTime: 24 * 60 * 60 * 1000,
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
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}

          {isError && (
            <div className="col-span-full flex items-center gap-3 py-6">
              <p className="text-muted-foreground text-sm">Failed to load drivers.</p>
              <button onClick={() => refetch()} className="text-xs text-primary hover:underline">
                Retry
              </button>
            </div>
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
                  className={`rounded-lg border px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center gap-2.5 sm:gap-3 transition-all text-left w-full cursor-pointer ${
                    isActive
                      ? "bg-surface-3 border-ring ring-1 ring-ring"
                      : "bg-surface-2 border-border hover:bg-accent/40"
                  }`}
                  style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                >
                <div className="text-2xl sm:text-3xl font-black text-muted-foreground/40 w-7 sm:w-8 text-center tabular-nums shrink-0">
                  {pos}
                </div>
                <DriverHeadshot driver={d} photos={photos ?? []} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs font-bold" style={{ color }}>
                      {d.Driver.code}
                    </span>
                    {d.wins !== "0" && (
                      <Badge className="bg-medal-gold/15 text-medal-gold border-medal-gold/30 text-[10px] px-1">
                        {d.wins}W
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium leading-tight truncate">
                    {d.Driver.givenName} {d.Driver.familyName}
                  </p>
                  <p className="text-xs leading-tight text-muted-foreground truncate">{team}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold font-mono text-sm sm:text-base leading-tight">{d.points}</p>
                  <p className="text-[10px] text-muted-foreground/50">pts</p>
                </div>
                </button>
                {/* Mobile inline detail panel — shown directly below selected driver on small screens */}
                {isActive && (
                  <div className="lg:hidden">
                    <DriverDetailPanel
                      driver={d}
                      news={news}
                      newsLoading={newsLoading}
                      seasonStats={seasonStats}
                      seasonLoading={seasonLoading}
                      careerData={careerData?.career}
                      careerLoading={careerLoading}
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
              seasonStats={seasonStats}
              seasonLoading={seasonLoading}
              careerData={careerData?.career}
              careerLoading={careerLoading}
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
  careerData?: import("@/lib/stats/driverCareer").DriverCareerStats;
  careerLoading: boolean;
  onClose: () => void;
}) {
  const team = driver.Constructors[0]?.name ?? "Unknown";
  const color = getTeamColor(team);
  const pos = parseInt(driver.position, 10);

  // Capture "now" once at mount so the render stays pure (react-hooks/purity).
  const [now] = useState(() => Date.now());
  const age =
    driver.Driver.dateOfBirth
      ? Math.floor(
          (now - new Date(driver.Driver.dateOfBirth).getTime()) /
            (1000 * 60 * 60 * 24 * 365.25)
        )
      : null;

  const flag = getFlag(driver.Driver.nationality);
  const staticData = getDriverStatic(driver.Driver.driverId);

  return (
    <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
      {/* ── Coloured header bar ── */}
      <div className="h-1 w-full" style={{ backgroundColor: color }} />

      {/* ── Header ── */}
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

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Position" value={`P${pos}`} />
          <StatBox label="Points" value={driver.points} />
          <StatBox label="Wins" value={driver.wins} highlight={driver.wins !== "0"} />
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="overflow-y-auto max-h-[calc(100vh-320px)] divide-y divide-border/60">
        {/* Bio */}
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

        {/* Driving style */}
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

        {/* Memorable Quotes carousel */}
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
                    — {quote.source.race} &middot; {quote.source.year}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Season stats */}
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

        {/* Career stats */}
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

        {/* Latest news */}
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function DriverHeadshot({
  driver,
  photos,
  size = 24,
}: {
  driver: DriverStanding;
  photos: DriverPhotoEntry[];
  size?: number;
}) {
  const [errored, setErrored] = useState(false);
  const team = driver.Constructors[0]?.name ?? "Unknown";
  const match = matchOpenF1Driver(photos as Parameters<typeof matchOpenF1Driver>[0], {
    driverId: driver.Driver.driverId,
    code: driver.Driver.code,
    familyName: driver.Driver.familyName,
  });
  const url = match?.headshot_url;

  if (errored || !url) return <TeamLogo team={team} size={size} />;

  return (
    <Image
      src={url}
      alt={`${driver.Driver.givenName} ${driver.Driver.familyName}`}
      width={size}
      height={size}
      className="rounded-full object-cover shrink-0"
      onError={() => setErrored(true)}
      unoptimized
    />
  );
}

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
    <div className="bg-surface-3/60 rounded-lg p-2.5 text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-lg font-black font-mono ${highlight ? "text-medal-gold" : ""}`}>
        {value}
      </p>
    </div>
  );
}

