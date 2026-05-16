import { NextResponse } from "next/server";
import { getRaceResults, getQualifyingResults, getSprintResults } from "@/lib/api/jolpica";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

export const revalidate = 3600;

const VALID_SEASON = /^(\d{4}|current)$/;
const VALID_ROUND = /^([1-9]|[1-2][0-9]|30)$/;
const VALID_TYPE = new Set(["race", "qualifying", "sprint"]);

export async function GET(req: Request) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`results:${ip}`, 60_000, 60)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season");
  const round = searchParams.get("round");
  const type = searchParams.get("type") ?? "race";

  if (!season || !round) {
    return NextResponse.json({ error: "season and round are required" }, { status: 400 });
  }
  if (!VALID_SEASON.test(season)) {
    return NextResponse.json({ error: "Invalid season parameter" }, { status: 400 });
  }
  if (!VALID_ROUND.test(round)) {
    return NextResponse.json({ error: "Invalid round parameter" }, { status: 400 });
  }
  if (!VALID_TYPE.has(type)) {
    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
  }

  try {
    if (type === "qualifying") {
      const results = await getQualifyingResults(season, round);
      return NextResponse.json({ results });
    }
    if (type === "sprint") {
      const results = await getSprintResults(season, round);
      return NextResponse.json({ results });
    }
    const results = await getRaceResults(season, round);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[/api/results] Error:", err);
    return NextResponse.json({ error: "Failed to fetch results" }, { status: 500 });
  }
}
