import { NextResponse } from "next/server";
import { getSchedule, getRaceResults } from "@/lib/api/jolpica";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_SEASON } from "@/lib/validators";
import { calculateDriverForm, type DriverForm } from "@/lib/stats/form";
import type { Race } from "@/lib/types";

export const revalidate = 300; // 5 minutes

const WINDOW = 5;

/** Epoch ms for a race's start; falls back to midnight UTC if no time given. */
function raceStart(r: Race): number {
  return Date.parse(`${r.date}T${r.time ?? "00:00:00Z"}`);
}

export async function GET(req: Request) {
  const blocked = rateLimited(req, "form");
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season") ?? "current";

  if (!VALID_SEASON.test(season)) {
    return NextResponse.json({ error: "Invalid season parameter" }, { status: 400 });
  }

  try {
    const schedule = await getSchedule(season);
    const now = Date.now();
    const completed = schedule
      .filter((r) => {
        const t = raceStart(r);
        return Number.isFinite(t) && t <= now;
      })
      .sort((a, b) => Number(a.round) - Number(b.round))
      .slice(-WINDOW);

    const races: Race[] = await Promise.all(
      completed.map(async (r) => {
        const Results = await getRaceResults(season, r.round).catch(() => []);
        return { ...r, Results };
      }),
    );

    const driverIds = new Set<string>();
    for (const race of races) {
      for (const res of race.Results ?? []) {
        if (res.Driver?.driverId) driverIds.add(res.Driver.driverId);
      }
    }

    const form: Record<string, DriverForm> = {};
    for (const id of driverIds) {
      form[id] = calculateDriverForm(races, id, WINDOW);
    }

    return NextResponse.json({ season, window: WINDOW, form });
  } catch (err) {
    console.error("[/api/form] Error:", err);
    return NextResponse.json({ error: "Failed to compute form" }, { status: 500 });
  }
}
