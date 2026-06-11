import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDriverComparison } from "@/hooks/useDriverComparison";

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useDriverComparison", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("loads standings/schedule and compare queries when both drivers and circuit are selected", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/standings")) {
        return new Response(
          JSON.stringify({
            drivers: [
              {
                position: "1",
                points: "100",
                wins: "3",
                Driver: {
                  driverId: "max_verstappen",
                  permanentNumber: "1",
                  code: "VER",
                  url: "",
                  givenName: "Max",
                  familyName: "Verstappen",
                  dateOfBirth: "1997-09-30",
                  nationality: "Dutch",
                },
                Constructors: [{ constructorId: "red_bull", name: "Red Bull", nationality: "Austrian", url: "" }],
              },
              {
                position: "2",
                points: "85",
                wins: "2",
                Driver: {
                  driverId: "lando_norris",
                  permanentNumber: "4",
                  code: "NOR",
                  url: "",
                  givenName: "Lando",
                  familyName: "Norris",
                  dateOfBirth: "1999-11-13",
                  nationality: "British",
                },
                Constructors: [{ constructorId: "mclaren", name: "McLaren", nationality: "British", url: "" }],
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/schedule")) {
        return new Response(
          JSON.stringify({
            races: [
              {
                season: "2026",
                round: "7",
                raceName: "Monaco Grand Prix",
                Circuit: {
                  circuitId: "monaco",
                  circuitName: "Circuit de Monaco",
                  url: "",
                  Location: { lat: "", long: "", locality: "Monaco", country: "Monaco" },
                },
                date: "2026-05-24",
                time: "13:00:00Z",
                url: "",
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/compare?view=season")) {
        return new Response(
          JSON.stringify({
            stats: {
              raceCompared: 5,
              raceAheadA: 3,
              raceAheadB: 2,
              qualiCompared: 5,
              qualiAheadA: 4,
              qualiAheadB: 1,
              a: { podiums: 4, poles: 2 },
              b: { podiums: 3, poles: 1 },
            },
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/compare?driverA=")) {
        return new Response(
          JSON.stringify({ circuitId: "monaco", history: [] }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(
      () => useDriverComparison("max_verstappen", "lando_norris", "monaco"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.standLoading).toBe(false);
      expect(result.current.schedLoading).toBe(false);
    });

    expect(result.current.bothSelected).toBe(true);
    expect(result.current.selectedCircuit?.Circuit.circuitId).toBe("monaco");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/compare?driverA=max_verstappen&driverB=lando_norris&circuitId=monaco"),
      expect.any(Object),
    );
  });

  it("does not run compare endpoints when one driver is missing", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/standings")) {
        return new Response(JSON.stringify({ drivers: [] }), { status: 200 });
      }
      if (url.includes("/api/schedule")) {
        return new Response(JSON.stringify({ races: [] }), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(
      () => useDriverComparison("", "lando_norris", "monaco"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.standLoading).toBe(false);
      expect(result.current.schedLoading).toBe(false);
    });

    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls.some((url) => url.includes("/api/compare?view=season"))).toBe(false);
    expect(urls.some((url) => url.includes("/api/compare?driverA="))).toBe(false);
  });
});
