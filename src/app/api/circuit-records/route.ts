import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { badRequest, serverError } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_ID } from "@/lib/validators";
import { getAllRaceResultsAtCircuit } from "@/lib/api/jolpica";
import { computeCircuitRecords } from "@/lib/stats/circuitRecords";

export const revalidate = 21600;

export async function GET(req: Request) {
  const blocked = rateLimited(req, "circuit-records");
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const circuitId = searchParams.get("circuitId") ?? "";

  if (!VALID_ID.test(circuitId)) {
    return badRequest("Invalid circuitId");
  }

  try {
    const getCached = unstable_cache(
      async (id: string) => {
        const allRaces = await getAllRaceResultsAtCircuit(id);
        return computeCircuitRecords(allRaces);
      },
      ["circuit-records", circuitId],
      { revalidate: 6 * 3600 }
    );

    const records = await getCached(circuitId);
    return NextResponse.json({ circuitId, records });
  } catch (err) {
    return serverError("circuit-records", err);
  }
}
