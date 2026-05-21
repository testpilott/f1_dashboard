import { NextResponse } from "next/server";

/** Standardized 400 response while preserving route-specific message text. */
export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

/** Standardized 500 response with consistent server-side logging format. */
export function serverError(routeName: string, err: unknown): NextResponse {
  console.error(`[/api/${routeName}] Error:`, err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}