import { NextResponse } from "next/server";
import { badRequest } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";

export const revalidate = 60;

// Map legacy `endpoint=` query values to the new per-endpoint route paths.
const ENDPOINT_TO_PATH: Record<string, string> = {
  sessions: "/api/sessions/info",
  result: "/api/sessions/result",
  drivers: "/api/sessions/drivers",
  stints: "/api/sessions/stints",
  laps: "/api/sessions/laps",
  pit: "/api/sessions/pit",
  weather: "/api/sessions/weather",
  race_control: "/api/sessions/race-control",
};

/**
 * Legacy compat shim for the old `/api/sessions?endpoint=` API surface.
 * Forwards to the new per-endpoint routes with a 308 redirect so callers
 * are nudged toward the new URLs but never silently broken.
 *
 * New code should call the per-endpoint routes directly (e.g.
 * `/api/sessions/laps?session_key=...`).
 */
export async function GET(req: Request) {
  const blocked = rateLimited(req, "sessions");
  if (blocked) return blocked;

  const url = new URL(req.url);
  const endpoint = url.searchParams.get("endpoint") ?? "sessions";
  const targetPath = ENDPOINT_TO_PATH[endpoint];
  if (!targetPath) {
    return badRequest("Invalid endpoint");
  }

  const target = new URL(targetPath, url);
  // Preserve every query param except `endpoint` itself.
  url.searchParams.forEach((value, key) => {
    if (key !== "endpoint") target.searchParams.set(key, value);
  });

  return NextResponse.redirect(target, 308);
}
