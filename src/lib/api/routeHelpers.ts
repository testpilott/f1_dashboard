import { NextResponse } from "next/server";

/** Standardized 400 response while preserving route-specific message text. */
export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

/** Standardized 404 response with consistent shape. */
export function notFound(message = "Not found"): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

/** Shared server-side error logging for routes, including graceful degradations. */
export function logRouteError(routeName: string, err: unknown): void {
  console.error(`[/api/${routeName}] Error:`, err);
}

/** Standardized 500 response with consistent server-side logging format. */
export function serverError(routeName: string, err: unknown): NextResponse {
  logRouteError(routeName, err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

/**
 * Documented graceful-degradation response. Use this when an upstream is
 * optional and we'd rather return a typed empty payload than HTTP 5xx.
 * Always returns HTTP 200 with `{ available: false, reason, ...extra }`.
 * Pass the route name to ensure the underlying failure is still logged.
 */
export function gracefulDegradation<T extends Record<string, unknown>>(
  routeName: string,
  reason: string,
  err?: unknown,
  extra: T = {} as T,
): NextResponse {
  if (err !== undefined) logRouteError(routeName, err);
  return NextResponse.json({ available: false, reason, ...extra });
}