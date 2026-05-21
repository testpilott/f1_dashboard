import { createApiFetcher } from "@/lib/api/createApiFetcher";
import type { MultiviewerCircuitInfo } from "@/lib/types/multiviewer";

const MULTIVIEWER_BASE = "https://api.multiviewer.app/api/v1";
const multiviewerApi = createApiFetcher(MULTIVIEWER_BASE, "Multiviewer");

/**
 * Fetch detailed circuit info (corner positions + track outline) from the
 * Multiviewer API. The `circuit_key` is available on every OpenF1 session.
 *
 * Data is static within a season — cache aggressively.
 */
export async function getCircuitInfo(
  circuitKey: number,
  year: number,
): Promise<MultiviewerCircuitInfo> {
  return multiviewerApi<MultiviewerCircuitInfo>(
    `/circuits/${circuitKey}/${year}`,
    86400,
  );
}
