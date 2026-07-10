import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProjectionsPage from "@/app/projections/page";
import type { ChampionshipProjection } from "@/lib/types";

const { navState, replaceMock } = vi.hoisted(() => ({
  navState: { view: "" },
  replaceMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/projections",
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => new URLSearchParams(navState.view ? `view=${navState.view}` : ""),
}));

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
  constructors: [
    {
      constructorId: "red_bull",
      constructorName: "Red Bull Racing",
      teamColour: "#3671C6",
      currentPoints: 300,
      championProbability: 82,
      top3Probability: 98,
      top5Probability: 99,
      projectedPoints: { p10: 380, p50: 430, p90: 470 },
    },
  ],
  totalSimulations: 10000,
  remainingRaces: 10,
  generatedAt: "2026-05-21T00:00:00Z",
};

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  navState.view = "";
  replaceMock.mockReset();
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

  it("defaults to drivers tab", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, json: async () => mockProjection });
    render(<ProjectionsPage />, { wrapper });
    await waitFor(() => expect(screen.getByText("Max Verstappen")).toBeInTheDocument());
    expect(screen.getByRole("tab", { name: "Drivers" })).toHaveAttribute("aria-selected", "true");
  });

  it("opens constructors tab from URL view param", async () => {
    navState.view = "constructors";
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, json: async () => mockProjection });
    render(<ProjectionsPage />, { wrapper });
    await waitFor(() => expect(screen.getByText("Red Bull Racing")).toBeInTheDocument());
    expect(screen.getByRole("tab", { name: "Constructors" })).toHaveAttribute("aria-selected", "true");
  });

  it("updates URL when switching tabs", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, json: async () => mockProjection });
    render(<ProjectionsPage />, { wrapper });
    await waitFor(() => expect(screen.getByRole("tab", { name: "Constructors" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("tab", { name: "Constructors" }));
    expect(replaceMock).toHaveBeenCalledWith("/projections?view=constructors", { scroll: false });
  });

  it("shows error state on failed fetch", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false });
    render(<ProjectionsPage />, { wrapper });
    await waitFor(() =>
      expect(screen.getByText(/failed to compute projections/i)).toBeInTheDocument()
    );
  });
});
