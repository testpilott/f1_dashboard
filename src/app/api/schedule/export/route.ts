import { NextResponse } from "next/server";
import { getSchedule } from "@/lib/api/jolpica";
import { badRequest, serverError } from "@/lib/api/routeHelpers";
import { edgeCacheControl } from "@/lib/api/edgeHeaders";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_SEASON } from "@/lib/validators";
import { buildICS } from "@/lib/ical";

export const revalidate = 3600; // 1 hour

export async function GET(req: Request) {
  const blocked = rateLimited(req, "schedule-export");
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season") ?? "current";

  if (!VALID_SEASON.test(season)) {
    return badRequest("Invalid season parameter");
  }

  try {
    const races = await getSchedule(season);
    const ics = buildICS(races, { season });
    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="f1-${season}.ics"`,
        "Cache-Control": edgeCacheControl("raceSchedule"),
      },
    });
  } catch (err) {
    return serverError("schedule/export", err);
  }
}
