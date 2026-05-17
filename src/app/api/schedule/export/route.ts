import { NextResponse } from "next/server";
import { getSchedule } from "@/lib/api/jolpica";
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
    return NextResponse.json({ error: "Invalid season parameter" }, { status: 400 });
  }

  try {
    const races = await getSchedule(season);
    const ics = buildICS(races, { season });
    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="f1-${season}.ics"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[/api/schedule/export] Error:", err);
    return NextResponse.json({ error: "Failed to build calendar" }, { status: 500 });
  }
}
