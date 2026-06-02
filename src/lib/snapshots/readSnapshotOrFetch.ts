import { unstable_cache } from "next/cache";
import { readSnapshot } from "./readSnapshot";
import { adaptiveRevalidate, cacheKeySuffix, type DataClass } from "@/lib/cacheStrategy";

export interface ReadSnapshotOrFetchOptions<T> {
  /** Snapshot file basename (no .json suffix), e.g. "standings-current". */
  key: string;
  /** Live fetch function; called only on snapshot miss. */
  liveFn: () => Promise<T>;
  /** DataClass that controls the hot-tier TTL. */
  dataClass: DataClass;
}

/**
 * Hot tier (unstable_cache) wraps cold tier (file) wraps live tier (network).
 * On live-fn 429/timeout, returns the snapshot if available — never throws
 * unless BOTH cold and live tiers fail.
 *
 * Logs "[snapshot-miss]" when the cold tier was empty and the live tier was
 * used (used by Phase 6 observability).
 */
export function readSnapshotOrFetch<T>(opts: ReadSnapshotOrFetchOptions<T>): Promise<T> {
  const { key, liveFn, dataClass } = opts;

  const cached = unstable_cache(
    async () => {
      const snapshot = await readSnapshot<T>(key);
      if (snapshot !== null) return snapshot;

      console.log(`[snapshot-miss] ${key} — falling through to live fetch`);
      try {
        return await liveFn();
      } catch (err) {
        // Last-resort retry of the snapshot in case it appeared between
        // the initial read and the live failure (e.g. mid-deploy).
        const second = await readSnapshot<T>(key);
        if (second !== null) {
          console.warn(`[snapshot-fallback] ${key} — live failed, served stale snapshot`);
          return second;
        }
        throw err;
      }
    },
    ["snapshot", key, cacheKeySuffix(dataClass)],
    { revalidate: adaptiveRevalidate(dataClass) },
  );

  return cached();
}
