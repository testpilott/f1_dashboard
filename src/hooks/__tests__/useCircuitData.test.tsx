import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCircuitData } from "@/hooks/useCircuitData";

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useCircuitData", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads circuit and incidents data when both endpoints succeed", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/circuit-info")) {
        return new Response(
          JSON.stringify({
            available: true,
            circuitName: "Silverstone",
            country: "UK",
            locality: "Silverstone",
            corners: [],
            trackX: [0, 100, 100, 0],
            trackY: [0, 0, 100, 100],
            trackPositionTime: [],
            rotation: 0,
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/race-incidents")) {
        return new Response(
          JSON.stringify({ available: true, incidents: [] }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCircuitData("2026", "5"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data?.available).toBe(true);
    });

    expect(result.current.incidentsData?.available).toBe(true);
  });

  it("returns unavailable incidents when incidents fetch fails", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/circuit-info")) {
        return new Response(
          JSON.stringify({
            available: true,
            circuitName: "Silverstone",
            country: "UK",
            locality: "Silverstone",
            corners: [],
            trackX: [0, 100, 100, 0],
            trackY: [0, 0, 100, 100],
            trackPositionTime: [],
            rotation: 0,
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/race-incidents")) {
        return new Response("{}", { status: 500 });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCircuitData("2026", "5"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data?.available).toBe(true);
    });

    expect(result.current.incidentsData?.available).toBe(false);
    expect(result.current.incidentsData?.reason).toMatch(/failed to load incidents/i);
  });
});
