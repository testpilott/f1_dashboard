import { NextResponse } from "next/server";
import { getDriverStandings, getConstructorStandings } from "@/lib/api/jolpica";

export const revalidate = 300; // 5 minutes

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season") ?? "current";

  try {
    const [drivers, constructors] = await Promise.all([
      getDriverStandings(season),
      getConstructorStandings(season),
    ]);
    return NextResponse.json({ drivers, constructors });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch standings", detail: String(err) },
      { status: 500 }
    );
  }
}
