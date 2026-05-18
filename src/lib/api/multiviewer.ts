import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";
import type { MultiviewerCircuitInfo } from "@/lib/types/multiviewer";

const MULTIVIEWER_BASE = "https://api.multiviewer.app/api/v1";

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
  const res = await fetchWithTimeout(
    `${MULTIVIEWER_BASE}/circuits/${circuitKey}/${year}`,
    { next: { revalidate: 86400 } }, // 24 hr — layout never changes mid-season
  );
  if (!res.ok) throw new Error(`Multiviewer fetch failed: ${res.status} circuit_key=${circuitKey}`);
  return res.json() as Promise<MultiviewerCircuitInfo>;
}
