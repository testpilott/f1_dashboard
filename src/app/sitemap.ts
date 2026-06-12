import type { MetadataRoute } from "next";
import { getSchedule } from "@/lib/api/jolpica";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://f1-dashboard-lilac.vercel.app";

export const revalidate = 86400; // 24h — schedule rarely changes outside re-paves.

const STATIC_PATHS = [
  "",
  "/standings",
  "/schedule",
  "/drivers",
  "/compare",
  "/projections",
  "/news",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: path === "" ? 1.0 : 0.8,
  }));

  try {
    const races = await getSchedule("current");
    const raceEntries: MetadataRoute.Sitemap = races.map((race) => ({
      url: `${BASE_URL}/race/${race.season}/${race.round}`,
      lastModified: new Date(race.date),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    }));
    return [...staticEntries, ...raceEntries];
  } catch {
    return staticEntries;
  }
}
