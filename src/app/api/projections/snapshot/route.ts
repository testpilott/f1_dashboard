import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api/routeHelpers";
import { VALID_SEASON } from "@/lib/validators";
import { warmSnapshot } from "@/lib/projections/snapshot";

// Cron route — must run on every invocation, never cached.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Cron-driven snapshot warmer for championship projections.
 *
 * Authentication: requires `Authorization: Bearer <CRON_SECRET>` matching the
 * `CRON_SECRET` env var. Vercel Cron automatically sends this header when
 * configured. Returns 401 otherwise.
 *
 * Behavior: runs the Monte Carlo pipeline for one season (default: "current")
 * and stores the result in the Next.js Data Cache via `warmSnapshot`. Idempotent
 * within a 24h window — repeated calls simply refresh the cache.
 *
 * Configure the schedule in `vercel.json` (or platform-equivalent) to invoke
 * this with `POST /api/projections/snapshot?season=current` every 24h.
 */
function isAuthorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${expected}`;
}

async function handle(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    const startedAt = Date.now();
    const projection = await warmSnapshot(season);
    const durationMs = Date.now() - startedAt;
    return NextResponse.json({
      ok: true,
      season,
      durationMs,
      driverCount: Array.isArray(projection.drivers) ? projection.drivers.length : 0,
    });
  } catch (err) {
    return serverError("projections-snapshot", err);
  }
}

export async function POST(req: Request) {
  return handle(req);
}

// Vercel Cron uses GET by default; accept both to be safe.
export async function GET(req: Request) {
  return handle(req);
}
