import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProjectionsPage from "@/app/projections/page";
import type { ChampionshipProjection } from "@/lib/types";

const mockProjection: ChampionshipProjection = {
  drivers: [
    {
      driverId: "verstappen",
      driverCode: "VER",
      fullName: "Max Verstappen",
      teamName: "Red Bull Racing",
      teamColour: "#3671C6",
      currentPoints: 100,
      winProbability: 75,
      podiumProbability: 90,
      top5Probability: 95,
      projectedPoints: { p10: 200, p50: 250, p90: 290 },
    },
  ],
  totalSimulations: 10000,
  remainingRaces: 10,
  generatedAt: new Date().toISOString(),
};

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("ProjectionsPage", () => {
  it("renders heading", () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, json: async () => mockProjection });
    render(<ProjectionsPage />, { wrapper });
    expect(screen.getByText("Championship Projections")).toBeInTheDocument();
  });

  it("shows driver after loading", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, json: async () => mockProjection });
    render(<ProjectionsPage />, { wrapper });
    await waitFor(() => expect(screen.getByText("Max Verstappen")).toBeInTheDocument());
  });

  it("shows error state on failed fetch", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false });
    render(<ProjectionsPage />, { wrapper });
    await waitFor(() =>
      expect(screen.getByText(/failed to compute projections/i)).toBeInTheDocument()
    );
  });
});
