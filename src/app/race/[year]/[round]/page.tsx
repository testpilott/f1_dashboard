import type { Metadata } from "next";
import RaceDetailClient from "@/components/race/RaceDetailClient";
import { getQualifyingResults, getRaceResults, getSchedule, getSprintResults } from "@/lib/api/jolpica";
import type { QualifyingResult, RaceResult } from "@/lib/types";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://f1-dashboard-lilac.vercel.app";

export async function generateMetadata(
  { params }: { params: Promise<{ year: string; round: string }> },
): Promise<Metadata> {
  const { year, round } = await params;
  try {
    const races = await getSchedule(year);
    const race = races.find((r) => r.round === round);
    if (!race) {
      return { title: `${year} · Race not found` };
    }
    const title = `${year} ${race.raceName}`;
    const description = `Full race results, qualifying, lap charts and telemetry for the ${year} ${race.raceName} at ${race.Circuit.circuitName}.`;
    return {
      title,
      description,
      openGraph: { title, description, type: "article" },
      twitter: { card: "summary_large_image", title, description },
    };
  } catch {
    return { title: `${year} Race · F1 Dashboard` };
  }
}

export default async function RaceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ year: string; round: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { year, round } = await params;
  const { tab } = await searchParams;
  const races = await getSchedule(year);
  const raceInfo = races.find((race) => race.round === round) ?? null;

  const [raceResults, qualifyingResults, sprintResults] = await Promise.allSettled([
    getRaceResults(year, round),
    getQualifyingResults(year, round),
    getSprintResults(year, round),
  ]);

  const resolvedRaceResults =
    raceResults.status === "fulfilled" ? (raceResults.value as RaceResult[]) : [];
  const resolvedQualifying =
    qualifyingResults.status === "fulfilled" ? (qualifyingResults.value as QualifyingResult[]) : [];
  const resolvedSprint =
    sprintResults.status === "fulfilled" ? (sprintResults.value as RaceResult[]) : [];

  // JSON-LD structured data (SportsEvent + BreadcrumbList).
  // Servers a Google rich-results hint for the race; rendered server-side, zero client cost.
  const ld = raceInfo
    ? {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "SportsEvent",
            name: `${year} ${raceInfo.raceName}`,
            startDate: raceInfo.date,
            sport: "Formula 1",
            location: {
              "@type": "Place",
              name: raceInfo.Circuit.circuitName,
              address: {
                "@type": "PostalAddress",
                addressCountry: raceInfo.Circuit.Location.country,
                addressLocality: raceInfo.Circuit.Location.locality,
              },
            },
            organizer: { "@type": "Organization", name: "Formula 1" },
            eventStatus: "https://schema.org/EventScheduled",
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Schedule", item: `${SITE_URL}/schedule` },
              { "@type": "ListItem", position: 3, name: `${year} ${raceInfo.raceName}` },
            ],
          },
        ],
      }
    : null;

  return (
    <>
      {ld && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />
      )}
      <RaceDetailClient
        initialTab={tab}
        initialData={{
          raceInfo,
          raceResults: resolvedRaceResults,
          qualifyingResults: resolvedQualifying,
          sprintResults: resolvedSprint,
        }}
      />
    </>
  );
}
