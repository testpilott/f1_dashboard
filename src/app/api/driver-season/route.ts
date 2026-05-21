import { NextResponse } from "next/server";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_SEASON, VALID_ID } from "@/lib/validators";
import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";

export const revalidate = 3600;

interface JolpicaResult {
  position: string;
  positionText: string;
  grid: string;
  points: string;
  status: string;
  FastestLap?: { rank: string };
}

interface JolpicaRace {
  round: string;
  raceName: string;
  Results?: JolpicaResult[];
}

export async function GET(req: Request) {
  const blocked = rateLimited(req, "driver-season");
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const season = searchParams.get("season") ?? "current";
  const driverId = searchParams.get("driverId") ?? "";

  if (!VALID_SEASON.test(season)) {
    return NextResponse.json({ error: "Invalid season" }, { status: 400 });
  }
  if (!VALID_ID.test(driverId)) {
    return NextResponse.json({ error: "Invalid driverId" }, { status: 400 });
  }

  try {
    const res = await fetchWithTimeout(
      `https://api.jolpi.ca/ergast/f1/${season}/drivers/${driverId}/results.json?limit=30`,
      { next: { revalidate: 3600 }, headers: { Accept: "application/json" } },
    );
    const json = (await res.json()) as {
      MRData?: { RaceTable?: { Races?: JolpicaRace[] } };
    };
    const rawRaces = json?.MRData?.RaceTable?.Races;
    const jolpicaRaces = Array.isArray(rawRaces) ? rawRaces : [];

    const races = jolpicaRaces.map((race) => {
      const result = Array.isArray(race.Results) ? race.Results[0] : undefined;
      // positionText is a number string when classified, "R"/"D"/"E"/"W"/"N"/"NC" when not
      const isClassified = /^\d+$/.test(result?.positionText ?? "");
      return {
        round: parseInt(race.round, 10),
        raceName: race.raceName,
        grid: parseInt(result?.grid ?? "0", 10),
        position: isClassified ? parseInt(result?.position ?? "0", 10) : null,
        points: parseFloat(result?.points ?? "0"),
        status: result?.status ?? "",
        fastestLap: result?.FastestLap?.rank === "1",
      };
    });

    const totals = {
      starts: races.length,
      wins: races.filter((r) => r.position === 1).length,
      podiums: races.filter((r) => r.position !== null && r.position <= 3).length,
      dnfs: races.filter((r) => r.position === null).length,
      fastestLaps: races.filter((r) => r.fastestLap).length,
      points: races.reduce((s, r) => s + r.points, 0),
    };

    return NextResponse.json({ season, driverId, races, totals });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch driver season data", detail: String(err) },
      { status: 500 },
    );
  }
}
