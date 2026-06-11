import { badRequest, serverError, cachedJson } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_ID } from "@/lib/validators";
import { getAllRaceResultsAtCircuit } from "@/lib/api/jolpica";
import { computeCircuitRecords } from "@/lib/stats/circuitRecords";
import { readSnapshotOrFetch } from "@/lib/snapshots/readSnapshotOrFetch";
import type { CircuitRecordsSnapshot } from "@/lib/snapshots/types";

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
    const payload = await readSnapshotOrFetch<CircuitRecordsSnapshot>({
      key: `circuit-records-${circuitId}`,
      dataClass: "circuitRecords",
      liveFn: async () => {
        const allRaces = await getAllRaceResultsAtCircuit(circuitId);
        const records = computeCircuitRecords(allRaces);
        return {
          circuitId,
          records,
          raceCount: allRaces.length,
          snapshotAt: new Date().toISOString(),
          source: "live",
        };
      },
    });
    return cachedJson(payload, "circuitRecords");
  } catch (err) {
    return serverError("circuit-records", err);
  }
}
