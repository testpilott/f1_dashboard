import { NextResponse } from "next/server";
import { getDriverStandings, getConstructorStandings } from "@/lib/api/jolpica";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

export const revalidate = 300; // 5 minutes

const VALID_SEASON = /^(\d{4}|current)$/;

export async function GET(req: Request) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`standings:${ip}`, 60_000, 60)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season") ?? "current";

  if (!VALID_SEASON.test(season)) {
    return NextResponse.json({ error: "Invalid season parameter" }, { status: 400 });
  }

  try {
    const [drivers, constructors] = await Promise.all([
      getDriverStandings(season),
      getConstructorStandings(season),
    ]);
    return NextResponse.json({ drivers, constructors });
  } catch (err) {
    console.error("[/api/standings] Error:", err);
    return NextResponse.json({ error: "Failed to fetch standings" }, { status: 500 });
  }
}
