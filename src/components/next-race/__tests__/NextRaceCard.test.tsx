import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";
import NextRaceCard from "@/components/next-race/NextRaceCard";
import type { Race } from "@/lib/types";

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

function withQuery(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

const mockRace: Race = {
  season: "2026",
  round: "8",
  url: "",
  raceName: "Monaco Grand Prix",
  Circuit: {
    circuitId: "monaco",
    url: "",
    circuitName: "Circuit de Monaco",
    Location: { lat: "43.7347", long: "7.4206", locality: "Monte-Carlo", country: "Monaco" },
  },
  date: "2099-05-24",
  time: "13:00:00Z",
};

beforeEach(() => {
  global.fetch = vi.fn(async () =>
    new Response(JSON.stringify({ race: mockRace }), { status: 200 })
  ) as unknown as typeof fetch;
});

describe("<NextRaceCard />", () => {
  it("renders the race name on the happy path", async () => {
    render(withQuery(<NextRaceCard initialRace={mockRace} initialWeather={null} />));
    expect(await screen.findByText("Monaco Grand Prix")).toBeInTheDocument();
  });

  it("shows the circuit name", async () => {
    render(withQuery(<NextRaceCard initialRace={mockRace} initialWeather={null} />));
    expect(await screen.findByText("Circuit de Monaco")).toBeInTheDocument();
  });

  it("shows empty state when no race is passed", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ race: null }), { status: 200 })
    );
    render(withQuery(<NextRaceCard initialRace={null} initialWeather={null} />));
    expect(await screen.findByText(/no upcoming races/i)).toBeInTheDocument();
  });
});
