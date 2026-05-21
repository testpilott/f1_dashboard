import { NextResponse } from "next/server";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_ID } from "@/lib/validators";
import {
  getDriverCareerWins,
  getDriverCareerP2,
  getDriverCareerP3,
  getDriverCareerStarts,
  getDriverCareerFastestLaps,
} from "@/lib/api/jolpica";
import { buildDriverCareerStats } from "@/lib/stats/driverCareer";

export const revalidate = 86400;

export async function GET(req: Request) {
  const limited = rateLimited(req, "driver-career");
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const driverId = searchParams.get("driverId") ?? "";

  if (!VALID_ID.test(driverId)) {
    return NextResponse.json({ error: "Invalid driverId" }, { status: 400 });
  }

  try {
    const [wins, p2, p3, starts, fastestLaps] = await Promise.allSettled([
      getDriverCareerWins(driverId),
      getDriverCareerP2(driverId),
      getDriverCareerP3(driverId),
      getDriverCareerStarts(driverId),
      getDriverCareerFastestLaps(driverId),
    ]);

    const career = buildDriverCareerStats({
      wins: wins.status === "fulfilled" ? wins.value : undefined,
      p2: p2.status === "fulfilled" ? p2.value : undefined,
      p3: p3.status === "fulfilled" ? p3.value : undefined,
      starts: starts.status === "fulfilled" ? starts.value : undefined,
      fastestLaps: fastestLaps.status === "fulfilled" ? fastestLaps.value : undefined,
      championships: undefined, // Jolpica career championships endpoint not available
    });

    return NextResponse.json({ driverId, career });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
