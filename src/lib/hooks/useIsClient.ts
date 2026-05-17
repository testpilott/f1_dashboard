import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/** Returns true on the client after hydration, false during SSR. */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
