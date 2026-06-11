"use client";

import { useState } from "react";
import { X, Zap } from "lucide-react";
import type { DriverStanding, NewsItem } from "@/lib/types";
import type { WikidataDriverProfile } from "@/lib/types/wikidata";
import { getTeamColor, getFlagByDemonym } from "@/lib/constants";
import { getDriverStatic } from "@/lib/drivers-static";
import { resolveBirthplace } from "@/lib/stats/driverEnrichment";
import TeamLogo from "@/components/ui/TeamLogo";
import StatBox from "@/components/drivers/StatBox";
import { ageFromDateOfBirth } from "@/lib/stats/age";
import DriverBioSection from "@/components/drivers/sections/DriverBioSection";
import DriverQuotesSection from "@/components/drivers/sections/DriverQuotesSection";
import DriverSeasonSection, { type DriverSeasonData } from "@/components/drivers/sections/DriverSeasonSection";
import DriverCareerSection from "@/components/drivers/sections/DriverCareerSection";
import DriverNewsSection from "@/components/drivers/sections/DriverNewsSection";

export type { DriverSeasonData } from "@/components/drivers/sections/DriverSeasonSection";

type DriverCareerStats = import("@/lib/stats/driverCareer").DriverCareerStats;

export default function DriverDetailPanel({
  driver,
  news,
  newsLoading,
  seasonStats,
  seasonLoading,
  careerData,
  careerLoading,
  wikidataProfile,
  wikidataLoading,
  onClose,
}: {
  driver: DriverStanding;
  news?: NewsItem[];
  newsLoading: boolean;
  seasonStats?: DriverSeasonData;
  seasonLoading: boolean;
  careerData?: DriverCareerStats;
  careerLoading: boolean;
  wikidataProfile?: WikidataDriverProfile | null;
  wikidataLoading?: boolean;
  onClose: () => void;
}) {
  const team = driver.Constructors[0]?.name ?? "Unknown";
  const color = getTeamColor(team);
  const pos = parseInt(driver.position, 10);

  const [now] = useState(() => new Date());
  const age = driver.Driver.dateOfBirth ? ageFromDateOfBirth(driver.Driver.dateOfBirth, now) : null;

  const flag = getFlagByDemonym(driver.Driver.nationality);
  const staticData = getDriverStatic(driver.Driver.driverId);
  const birthplace = resolveBirthplace(wikidataProfile ?? null, staticData?.hometown ?? null);

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
        <DriverBioSection
          driver={driver}
          flag={flag}
          age={age}
          wikidataLoading={Boolean(wikidataLoading)}
          birthplace={birthplace}
        />

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
          <DriverQuotesSection quotes={staticData.quotes} color={color} />
        )}

        <DriverSeasonSection seasonLoading={seasonLoading} seasonStats={seasonStats} />

        <DriverCareerSection careerLoading={careerLoading} careerData={careerData} />

        <DriverNewsSection newsLoading={newsLoading} news={news} />
      </div>
    </div>
  );
}