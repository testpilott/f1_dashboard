import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";
import StandingsTables from "@/components/standings/StandingsTables";

function withQuery(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

const mockData = {
  drivers: [
    {
      position: "1",
      positionText: "1",
      points: "100",
      wins: "3",
      Driver: {
        driverId: "verstappen",
        permanentNumber: "1",
        code: "VER",
        url: "",
        givenName: "Max",
        familyName: "Verstappen",
        dateOfBirth: "1997-09-30",
        nationality: "Dutch",
      },
      Constructors: [
        { constructorId: "red_bull", url: "", name: "Red Bull Racing", nationality: "Austrian" },
      ],
    },
  ],
  constructors: [
    {
      position: "1",
      positionText: "1",
      points: "200",
      wins: "5",
      Constructor: {
        constructorId: "red_bull",
        url: "",
        name: "Red Bull Racing",
        nationality: "Austrian",
      },
    },
  ],
};

beforeEach(() => {
  global.fetch = vi.fn(async () =>
    new Response(JSON.stringify(mockData), { status: 200 })
  ) as unknown as typeof fetch;
});

describe("<StandingsTables />", () => {
  it("renders driver name and points on the happy path", async () => {
    render(withQuery(<StandingsTables initialData={mockData} />));
    expect(await screen.findByText(/verstappen/i)).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("renders a Constructors tab", () => {
    render(withQuery(<StandingsTables initialData={mockData} />));
    expect(screen.getByRole("tab", { name: /constructors/i })).toBeInTheDocument();
  });

  it("shows empty state when no drivers available", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ drivers: [], constructors: [] }), { status: 200 })
    );
    render(withQuery(<StandingsTables initialData={{ drivers: [], constructors: [] }} />));
    expect(await screen.findByText(/no standings available/i)).toBeInTheDocument();
  });
});
