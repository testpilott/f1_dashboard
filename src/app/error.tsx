"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-zinc-100">Something went wrong</h2>
        <p className="text-sm text-zinc-400 max-w-sm">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
      </div>
      <button
        onClick={reset}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
      >
        Try again
      </button>
    </div>
  );
}
