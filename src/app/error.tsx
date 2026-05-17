"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.error(error);
  }, [error]);

  function handleReset() {
    // Clear all React Query error/data cache so queries re-fetch on remount
    // instead of immediately returning the cached error state.
    queryClient.resetQueries();
    reset();
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
      </div>
      <button
        onClick={handleReset}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Try again
      </button>
    </div>
  );
}
