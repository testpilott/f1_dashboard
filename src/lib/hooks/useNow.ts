import { useSyncExternalStore } from "react";

function subscribe(callback: () => void): () => void {
  const id = setInterval(callback, 1000);
  return () => clearInterval(id);
}

/**
 * Returns the current timestamp (ms since epoch), updated every second.
 * Returns null during SSR so callers can suppress server-rendered output.
 */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, () => Date.now(), () => null);
}
