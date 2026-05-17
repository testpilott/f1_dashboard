import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";
import DriversPage from "@/app/drivers/page";

function withQuery(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

const mockDrivers = [
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
];

beforeEach(() => {
  global.fetch = vi.fn(async () =>
    new Response(JSON.stringify({ drivers: mockDrivers }), { status: 200 })
  ) as unknown as typeof fetch;
});

describe("<DriversPage />", () => {
  it("renders the page heading", () => {
    render(withQuery(<DriversPage />));
    expect(screen.getByText(/2026 Drivers/i)).toBeInTheDocument();
  });

  it("shows a driver card after loading", async () => {
    render(withQuery(<DriversPage />));
    expect(await screen.findByText(/Verstappen/i)).toBeInTheDocument();
  });

  it("shows error state when fetch fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Network error"));
    render(withQuery(<DriversPage />));
    expect(await screen.findByText(/failed to load drivers/i)).toBeInTheDocument();
  });
});
