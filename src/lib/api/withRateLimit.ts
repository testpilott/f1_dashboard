import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

/**
 * Check the rate limit for an incoming request.
 *
 * Returns a ready-to-send 429 `NextResponse` if the limit has been exceeded,
 * or `null` if the request should proceed normally.
 *
 * The 429 carries a `Retry-After` derived from the route's actual window
 * (not a fixed value) so well-behaved clients back off for the right
 * duration, plus `X-RateLimit-Limit` for observability.
 *
 * Usage in a route handler:
 * ```ts
 * const blocked = rateLimited(req, "standings");
 * if (blocked) return blocked;
 * ```
 *
 * @param req       Incoming Next.js Request.
 * @param routeKey  Short label for the route (e.g. "standings", "projections").
 * @param opts      Optional overrides. Defaults: windowMs=60_000, max=60.
 */
export function rateLimited(
  req: Request,
  routeKey: string,
  opts: { windowMs?: number; max?: number } = {}
): NextResponse | null {
  const { windowMs = 60_000, max = 60 } = opts;
  const ip = getClientIp(req);
  if (!checkRateLimit(`${routeKey}:${ip}`, windowMs, max)) {
    const retryAfterSeconds = Math.max(1, Math.ceil(windowMs / 1000));
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(max),
        },
      }
    );
  }
  return null;
}
