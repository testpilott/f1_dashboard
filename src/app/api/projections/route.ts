import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_SEASON } from "@/lib/validators";
import { getCachedProjections } from "@/lib/projections/snapshot";

// Cache TTL is owned by the snapshot module; this segment value is informational.
export const revalidate = 86400;

/**
 * Read-only projections endpoint. Serves results from the shared Next.js Data
 * Cache (populated by `getCachedProjections`). The scheduled cron at
 * `/api/projections/snapshot` pre-warms the cache so the first user request
 * after a deploy/TTL expiry does not pay the Monte Carlo cost; if a request
 * still arrives on a cold cache, it will pay the compute exactly once and the
 * result will be shared with every subsequent reader for `revalidate` seconds.
 *
 * NOTE: An earlier version of this route gated on an in-memory `Set` of warmed
 * seasons. That Set is per-lambda-instance, so reads served by any instance
 * other than the one warmed by the cron got `{ available: false }` and the
 * client crashed. `unstable_cache` is globally shared via the Vercel Data
 * Cache and is the correct gate.
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

  try {
    const projections = await getCachedProjections(season);
    return NextResponse.json(projections);
  } catch (err) {
    return serverError("projections", err);
  }
}
