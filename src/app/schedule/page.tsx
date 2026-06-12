import { Suspense } from "react";
import type { Metadata } from "next";
import { getSchedule } from "@/lib/api/jolpica";
import ScheduleClient from "@/components/schedule/ScheduleClient";
import SeasonPicker from "@/components/ui/SeasonPicker";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Schedule",
  description:
    "Full Formula 1 season schedule with race times, circuits and links to results.",
  openGraph: {
    title: "Schedule · F1 Dashboard",
    description:
      "Full Formula 1 season schedule with race times, circuits and links to results.",
  },
};

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season: rawSeason } = await searchParams;
  const season = /^\d{4}$/.test(rawSeason ?? "") ? rawSeason! : "current";

  const races = await getSchedule(season);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Race Calendar</h1>
        <Suspense>
          <SeasonPicker current={season} />
        </Suspense>
      </div>
      {!races.length ? (
        <p className="text-muted-foreground">No schedule data available.</p>
      ) : (
        <ScheduleClient races={races} />
      )}
    </div>
  );
}
