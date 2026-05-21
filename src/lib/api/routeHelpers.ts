import { NextResponse } from "next/server";

/** Standardized 400 response while preserving route-specific message text. */
export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
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