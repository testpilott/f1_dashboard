"use client";

import { useQuery } from "@tanstack/react-query";
import type { DriverStanding, NewsItem } from "@/lib/types";
import type { WikidataDriverProfile } from "@/lib/types/wikidata";
import { fetchJson } from "@/lib/api/clientFetch";
import type { DriverPhotoEntry } from "@/components/drivers/DriverHeadshot";
import type { DriverSeasonData } from "@/components/drivers/DriverDetailPanel";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DRIVER_PHOTOS_STALE_MS = 5 * 60 * 1000;

async function fetchStandings(season: string) {
  const d = await fetchJson<{ drivers?: DriverStanding[] }>(`/api/standings?season=${encodeURIComponent(season)}`);
  return (Array.isArray(d.drivers) ? d.drivers : []) as DriverStanding[];
}

async function fetchDriverNews(lastName: string): Promise<NewsItem[]> {
  const d = await fetchJson<{ items?: NewsItem[] }>(`/api/news?filter=${encodeURIComponent(lastName.toLowerCase())}`);
  return Array.isArray(d.items) ? d.items : [];
}

async function fetchDriverPhotos(): Promise<DriverPhotoEntry[]> {
  const d = await fetchJson<{ photos?: DriverPhotoEntry[] }>("/api/driver-photos");
  return Array.isArray(d.photos) ? d.photos : [];
}

async function fetchDriverSeason(driverId: string, season: string): Promise<DriverSeasonData> {
  return fetchJson<DriverSeasonData>(`/api/driver-season?season=${encodeURIComponent(season)}&driverId=${encodeURIComponent(driverId)}`);
}

async function fetchWikidataProfile(wikiUrl: string): Promise<WikidataDriverProfile | null> {
  if (!wikiUrl) return null;
  return fetchJson<WikidataDriverProfile>(`/api/wikidata?wikiUrl=${encodeURIComponent(wikiUrl)}`);
}

type DriverCareerResponse = {
  driverId: string;
  career: import("@/lib/stats/driverCareer").DriverCareerStats;
};

export function useDriverDetails(selectedDriverId: string | null, season: string) {
  const { data: standings, isLoading, isError, refetch } = useQuery({
    queryKey: ["driver-standings", season],
    queryFn: () => fetchStandings(season),
    staleTime: 5 * 60 * 1000,
  });

  const { data: photos } = useQuery({
    queryKey: ["driver-photos"],
    queryFn: fetchDriverPhotos,
    staleTime: DRIVER_PHOTOS_STALE_MS,
  });

  const selectedDriver = standings?.find((d) => d.Driver.driverId === selectedDriverId) ?? null;

  const { data: news, isLoading: newsLoading } = useQuery({
    queryKey: ["driver-news", selectedDriver?.Driver.familyName],
    queryFn: () => fetchDriverNews(selectedDriver!.Driver.familyName),
    enabled: Boolean(selectedDriver),
    staleTime: 15 * 60 * 1000,
  });

  const { data: seasonStats, isLoading: seasonLoading } = useQuery({
    queryKey: ["driver-season", season, selectedDriverId],
    queryFn: () => fetchDriverSeason(selectedDriverId!, season),
    enabled: Boolean(selectedDriverId),
    staleTime: ONE_WEEK_MS,
  });

  const { data: careerData, isLoading: careerLoading } = useQuery({
    queryKey: ["driver-career", selectedDriverId],
    queryFn: () =>
      fetchJson<DriverCareerResponse>(`/api/driver-career?driverId=${encodeURIComponent(selectedDriverId!)}`),
    enabled: Boolean(selectedDriverId),
    staleTime: ONE_WEEK_MS,
  });

  const { data: wikidataProfile, isLoading: wikidataLoading } = useQuery({
    queryKey: ["wikidata-profile", selectedDriverId],
    queryFn: () => fetchWikidataProfile(selectedDriver?.Driver.url ?? ""),
    enabled: Boolean(selectedDriver?.Driver.url),
    staleTime: ONE_WEEK_MS,
  });

  return {
    standings: standings ?? [],
    photos: photos ?? [],
    selectedDriver,
    isLoading,
    isError,
    refetch,
    news,
    newsLoading,
    seasonStats,
    seasonLoading,
    career: careerData?.career,
    careerLoading,
    wikidata: wikidataProfile ?? null,
    wikidataLoading,
  };
}
