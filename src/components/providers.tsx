"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { clientQueryRetry } from "@/lib/api/queryRetry";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale after 2 min — stays well within 30 req/min OpenF1 limit
            staleTime: 2 * 60 * 1000,
            // Keep cached for 10 min
            gcTime: 10 * 60 * 1000,
            // Bounded retry for transient failures only — never 4xx/429, so
            // a rate-limited client backs off instead of tripling traffic.
            retry: clientQueryRetry,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
          },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>{children}</TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
