import { NextResponse } from "next/server";
import { getDriverStandings, getConstructorStandings } from "@/lib/api/jolpica";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_SEASON } from "@/lib/validators";

export const revalidate = 300; // 5 minutes

export async function GET(req: Request) {
  const blocked = rateLimited(req, "standings");
  if (blocked) return blocked;

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
