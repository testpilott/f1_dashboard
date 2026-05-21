import { NextResponse } from "next/server";
import { getDriverStandings, getConstructorStandings } from "@/lib/api/jolpica";
import { badRequest, serverError } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_SEASON } from "@/lib/validators";

export const revalidate = 300; // 5 minutes

export async function GET(req: Request) {
  const blocked = rateLimited(req, "standings");
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season") ?? "current";

  if (!VALID_SEASON.test(season)) {
    return badRequest("Invalid season parameter");
  }

  try {
    const [drivers, constructors] = await Promise.all([
      getDriverStandings(season),
      getConstructorStandings(season),
    ]);
    return NextResponse.json({ drivers, constructors });
  } catch (err) {
    return serverError("standings", err);
  }
}
