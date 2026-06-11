import { NextResponse } from "next/server";
import { TEAM_LOGOS } from "@/lib/constants";
import { badRequest, notFound } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";

/**
 * Redirects to the local static logo file for a given team.
 * All logos live in /public/logos/ and are served directly by Next.js.
 * This route exists as a stable API endpoint for external consumers.
 *
 * GET /api/logo?team=Ferrari
 */
export async function GET(req: Request) {
  const blocked = rateLimited(req, "logo");
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const team = searchParams.get("team");

  if (!team) {
    return badRequest("team param required");
  }

  // TEAM_LOGOS is a compile-time whitelist — no user-controlled URL construction
  const logoPath = TEAM_LOGOS[team];
  if (!logoPath) {
    return notFound("unknown team");
  }

  // Redirect to the static file; path is always a safe /logos/*.webp local path
  return NextResponse.redirect(new URL(logoPath, req.url), {
    headers: {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
    },
  });
}
