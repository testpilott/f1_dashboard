import { NextResponse } from "next/server";
import { getDriverStandings, getConstructorStandings } from "@/lib/api/jolpica";
import { badRequest, gracefulDegradation } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_SEASON } from "@/lib/validators";
import { readSnapshotOrFetch } from "@/lib/snapshots/readSnapshotOrFetch";

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
    const payload = await readSnapshotOrFetch({
      key: `standings-${season}`,
      dataClass: "liveStandings",
      liveFn: async () => ({
        drivers: await getDriverStandings(season),
        constructors: await getConstructorStandings(season),
        snapshotAt: new Date().toISOString(),
        source: "live",
      }),
    });
    return NextResponse.json(payload);
  } catch (err) {
    return gracefulDegradation("standings", "upstream unavailable", err, {
      drivers: [] as unknown[],
      constructors: [] as unknown[],
    });
  }
}
