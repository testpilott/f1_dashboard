import { NextResponse } from "next/server";
import { getSchedule, getNextRace, getLastRace } from "@/lib/api/jolpica";

export const revalidate = 3600; // 1 hour

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season") ?? "current";
  const view = searchParams.get("view"); // "next" | "last" | undefined

  try {
    if (view === "next") {
      const race = await getNextRace();
      return NextResponse.json({ race });
    }
    if (view === "last") {
      const race = await getLastRace();
      return NextResponse.json({ race });
    }
    const races = await getSchedule(season);
    return NextResponse.json({ races });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch schedule", detail: String(err) },
      { status: 500 }
    );
  }
}
