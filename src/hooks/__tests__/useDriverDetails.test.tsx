import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDriverDetails } from "@/hooks/useDriverDetails";

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useDriverDetails", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads standings, photos and selected-driver detail queries", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/standings")) {
        return new Response(
          JSON.stringify({
            drivers: [
              {
                position: "1",
                points: "25",
                wins: "1",
                Driver: {
                  driverId: "max_verstappen",
                  permanentNumber: "1",
                  code: "VER",
                  givenName: "Max",
                  familyName: "Verstappen",
                  url: "https://wikidata.org/max",
                  dateOfBirth: "1997-09-30",
                  nationality: "Dutch",
                },
                Constructors: [{ constructorId: "red_bull", name: "Red Bull", nationality: "Austrian", url: "" }],
              },
            ],
            sprintWins: { drivers: { max_verstappen: 2 }, constructors: { red_bull: 2 } },
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/driver-photos")) {
        return new Response(JSON.stringify({ photos: [] }), { status: 200 });
      }
      if (url.includes("/api/news")) {
        return new Response(JSON.stringify({ items: [{ title: "headline", link: "https://x", pubDate: "2026-01-01" }] }), { status: 200 });
      }
      if (url.includes("/api/driver-season")) {
        return new Response(JSON.stringify({ season: "2026", driverId: "max_verstappen", summary: { driverId: "max_verstappen", season: "2026", rows: [], aggregates: { races: 1, wins: 1, podiums: 1, points: 25, dnfs: 0, fastestLaps: 0, avgFinish: 1, avgGrid: 1 } } }), { status: 200 });
      }
      if (url.includes("/api/driver-career")) {
        return new Response(JSON.stringify({ driverId: "max_verstappen", career: { wins: 60, podiums: 98, starts: 210, fastestLaps: 44, championships: 4 } }), { status: 200 });
      }
      if (url.includes("/api/wikidata")) {
        return new Response(JSON.stringify({ description: "Profile" }), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useDriverDetails("max_verstappen", "2026"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.standings.length).toBe(1);
      expect(result.current.newsLoading).toBe(false);
      expect(result.current.careerLoading).toBe(false);
    });

    expect(result.current.career?.wins).toBe(60);
    // Sprint tallies from the standings payload are exposed for the chip UI.
    expect(result.current.sprintWins).toEqual({
      drivers: { max_verstappen: 2 },
      constructors: { red_bull: 2 },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/driver-career?driverId=max_verstappen"),
      expect.any(Object),
    );
  });

  it("exposes sprintWins as null when the standings payload omits it", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/standings")) {
        return new Response(JSON.stringify({ drivers: [] }), { status: 200 });
      }
      if (url.includes("/api/driver-photos")) {
        return new Response(JSON.stringify({ photos: [] }), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useDriverDetails(null, "2026"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.sprintWins).toBeNull();
  });

  it("does not fire selected-driver enrichment queries when no driver is selected", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/standings")) {
        return new Response(JSON.stringify({ drivers: [] }), { status: 200 });
      }
      if (url.includes("/api/driver-photos")) {
        return new Response(JSON.stringify({ photos: [] }), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useDriverDetails(null, "2026"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const requestedUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(requestedUrls.some((url) => url.includes("/api/driver-season"))).toBe(false);
    expect(requestedUrls.some((url) => url.includes("/api/driver-career"))).toBe(false);
    expect(requestedUrls.some((url) => url.includes("/api/news"))).toBe(false);
    expect(requestedUrls.some((url) => url.includes("/api/wikidata"))).toBe(false);
  });
});
