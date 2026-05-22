import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_SESSION_KEY } from "@/lib/validators";

/**
 * Shared boilerplate for the per-endpoint sessions routes. Each route under
 * `/api/sessions/<name>` validates `session_key`, calls one OpenF1 fetcher,
 * and wraps the result in `{ <name>: data }`. This helper consolidates the
 * validation + error handling so each route file stays small and focused.
 *
 * The route's revalidate-segment-export is set per file (literal value) so
 * Next.js can pick up the static value at build time; we don't fold the TTL
 * into this helper.
 */
export async function handleSessionKeyedEndpoint<T>({
  req,
  routeKey,
  allowLatest,
  fetcher,
  responseKey,
}: {
  req: Request;
  routeKey: string;
  allowLatest: boolean;
  fetcher: (key: number | "latest") => Promise<T>;
  responseKey: string;
}): Promise<Response> {
  const blocked = rateLimited(req, routeKey);
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const sessionKey = searchParams.get("session_key");

  if (!sessionKey) {
    return badRequest("session_key required");
  }
  if (!VALID_SESSION_KEY.test(sessionKey)) {
    return badRequest("Invalid session_key parameter");
  }
  if (sessionKey === "latest" && !allowLatest) {
    return badRequest("This endpoint requires a numeric session_key");
  }

  const key = sessionKey === "latest" ? "latest" : parseInt(sessionKey, 10);

  try {
    const data = await fetcher(key as number | "latest");
    return NextResponse.json({ [responseKey]: data });
  } catch (err) {
    return serverError(routeKey, err);
  }
}
