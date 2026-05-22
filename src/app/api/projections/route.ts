import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_SEASON } from "@/lib/validators";
import { getCachedProjections, isSnapshotWarmed } from "@/lib/projections/snapshot";

// Cache TTL is owned by the snapshot module; this segment value is informational.
export const revalidate = 86400;

/**
 * Read-only projections endpoint. Returns cached results only — never triggers
 * the Monte Carlo pipeline on a cold cache. Warming is the responsibility of
 * the scheduled cron at `/api/projections/snapshot`.
 *
 * Graceful degradation: when no warm snapshot exists in this lambda instance,
 * respond with `{ available: false, reason }` rather than 500 or a long stall.
 */
export async function GET(req: Request) {
  const blocked = rateLimited(req, "projections", { max: 10 });
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season") ?? "current";

  if (!VALID_SEASON.test(season)) {
    return badRequest("Invalid season parameter");
  }
  if (season !== "current") {
    const yr = parseInt(season, 10);
    if (yr < 2000 || yr > 2030) {
      return badRequest("Season out of range");
    }
  }

  if (!isSnapshotWarmed(season)) {
    return NextResponse.json(
      {
        available: false,
        reason: "Snapshot pending — projections refresh runs on a schedule",
      },
      { status: 200 },
    );
  }

  try {
    const projections = await getCachedProjections(season);
    return NextResponse.json(projections);
  } catch (err) {
    return serverError("projections", err);
  }
}
