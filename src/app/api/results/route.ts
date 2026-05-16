import { NextResponse } from "next/server";
import { getRaceResults, getQualifyingResults, getSprintResults } from "@/lib/api/jolpica";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_SEASON, VALID_ROUND, VALID_TYPE } from "@/lib/validators";

export const revalidate = 3600;

export async function GET(req: Request) {
  const blocked = rateLimited(req, "results");
  if (blocked) return blocked;

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
