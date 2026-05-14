import { NextResponse } from "next/server";
import { getRaceResults, getQualifyingResults, getSprintResults } from "@/lib/api/jolpica";

export const revalidate = 3600;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season");
  const round = searchParams.get("round");
  const type = searchParams.get("type") ?? "race"; // race | qualifying | sprint

  if (!season || !round) {
    return NextResponse.json({ error: "season and round are required" }, { status: 400 });
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
    return NextResponse.json(
      { error: "Failed to fetch results", detail: String(err) },
      { status: 500 }
    );
  }
}
