import { NextResponse } from "next/server";
import { getSchedule, getNextRace, getLastRace } from "@/lib/api/jolpica";
import { badRequest, serverError, cachedJson } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_SEASON, VALID_VIEW } from "@/lib/validators";
import { readSnapshotOrFetch } from "@/lib/snapshots/readSnapshotOrFetch";

export const revalidate = 3600; // 1 hour

export async function GET(req: Request) {
  const blocked = rateLimited(req, "schedule");
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season") ?? "current";
  const view = searchParams.get("view");

  if (!VALID_SEASON.test(season)) {
    return badRequest("Invalid season");
  }
  if (view !== null && !VALID_VIEW.has(view)) {
    return badRequest("Invalid view");
  }

  try {
    if (view === "next") {
      const race = await getNextRace();
      return NextResponse.json({ race });
    }
    if (view === "last") {
      const race = await getLastRace();
      return NextResponse.json({ race });
    }
    const payload = await readSnapshotOrFetch({
      key: `schedule-${season}`,
      dataClass: "seasonSchedule",
      liveFn: async () => ({
        races: await getSchedule(season),
        snapshotAt: new Date().toISOString(),
        source: "live",
      }),
    });
    return cachedJson(payload, "seasonSchedule");
  } catch (err) {
    return serverError("schedule", err);
  }
}
