import { NextResponse } from "next/server";
import { getDriverStandings } from "@/lib/api/jolpica";
import { getSchedule } from "@/lib/api/jolpica";
import { runProjections } from "@/lib/projections/montecarlo";

export const revalidate = 3600; // 1 hour

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season") ?? "current";

  try {
    const [standings, schedule] = await Promise.all([
      getDriverStandings(season),
      getSchedule(season),
    ]);

    if (!standings.length || !schedule.length) {
      return NextResponse.json({ error: "No data available" }, { status: 404 });
    }

    // Determine how many rounds have been completed by checking the last round
    // that has results in the standings table
    const standingsRound = parseInt(
      (schedule.find((r) => r.Results?.length) ? "0" : "0"),
      10
    );
    // Use a reasonable default: find the last race in the schedule before today
    const now = new Date();
    const lastCompleted = schedule
      .filter((r) => new Date(r.date) < now)
      .sort((a, b) => parseInt(b.round, 10) - parseInt(a.round, 10))[0];
    const completedRound = lastCompleted ? parseInt(lastCompleted.round, 10) : 0;

    const projections = runProjections(standings, schedule, completedRound);
    return NextResponse.json(projections);
  } catch (err) {
    return NextResponse.json(
      { error: "Projection failed", detail: String(err) },
      { status: 500 }
    );
  }
}
