import type { Race } from "@/lib/types";
import { getSchedule } from "@/lib/api/jolpica";
import ScheduleClient from "@/components/schedule/ScheduleClient";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const races = await getSchedule();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">2026 Race Calendar</h1>
      {!races.length ? (
        <p className="text-muted-foreground">No schedule data available.</p>
      ) : (
        <ScheduleClient races={races} />
      )}
    </div>
  );
}
