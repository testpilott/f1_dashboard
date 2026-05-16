import { NextResponse } from "next/server";
import { getRaceResultsAtCircuit, getQualifyingResultsAtCircuit } from "@/lib/api/jolpica";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

export const revalidate = 300; // 5 min

const CURRENT_YEAR = new Date().getFullYear();
const HISTORY_YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3];

// Safe identifier pattern: lowercase letters, digits, hyphens only (Ergast format)
const VALID_ID = /^[a-z0-9_-]{1,40}$/;

export async function GET(req: Request) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`compare:${ip}`, 60_000, 60)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  const { searchParams } = new URL(req.url);
  const driverA = searchParams.get("driverA");
  const driverB = searchParams.get("driverB");
  const circuitId = searchParams.get("circuitId");

  if (!driverA || !driverB || !circuitId) {
    return NextResponse.json(
      { error: "driverA, driverB, and circuitId are all required" },
      { status: 400 }
    );
  }
  if (!VALID_ID.test(driverA) || !VALID_ID.test(driverB)) {
    return NextResponse.json({ error: "Invalid driver identifier" }, { status: 400 });
  }
  if (!VALID_ID.test(circuitId)) {
    return NextResponse.json({ error: "Invalid circuit identifier" }, { status: 400 });
  }

  const yearResults = await Promise.all(
    HISTORY_YEARS.map(async (year) => {
      const [race, quali] = await Promise.allSettled([
        getRaceResultsAtCircuit(String(year), circuitId),
        getQualifyingResultsAtCircuit(String(year), circuitId),
      ]);
      return {
        year,
        race: race.status === "fulfilled" ? race.value : [],
        quali: quali.status === "fulfilled" ? quali.value : [],
      };
    })
  );

  const history = yearResults
    .filter(({ race, quali }) => race.length > 0 || quali.length > 0)
    .map(({ year, race, quali }) => {
      const pick = (driverId: string) => {
        const r = race.find((x) => x.Driver.driverId === driverId);
        const q = quali.find((x) => x.Driver.driverId === driverId);
        return {
          race: r
            ? {
                position: parseInt(r.position, 10) || null,
                points: parseFloat(r.points),
                status: r.status,
                fastestLap: r.FastestLap?.Time?.time ?? null,
                hasFastestLap: r.FastestLap?.rank === "1",
              }
            : null,
          quali: q
            ? {
                position: parseInt(q.position, 10) || null,
                bestTime: q.Q3 ?? q.Q2 ?? q.Q1 ?? null,
              }
            : null,
        };
      };
      return { year, a: pick(driverA), b: pick(driverB) };
    });

  return NextResponse.json({ circuitId, driverA, driverB, history });
}

