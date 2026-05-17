import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";
import TelemetryPanel from "@/components/race/TelemetryPanel";

function withQuery(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

const available = {
  available: true,
  race: "Italian Grand Prix",
  drivers: [
    {
      driverNumber: 16,
      acronym: "LEC",
      team: "Ferrari",
      colour: "#E8002D",
      stints: [
        { stintNumber: 1, compound: "SOFT", lapStart: 1, lapEnd: 20, laps: 20, avgSec: 92.456, degradationSlope: 0.12 },
        { stintNumber: 2, compound: "HARD", lapStart: 21, lapEnd: 53, laps: 33, avgSec: 93.1, degradationSlope: -0.05 },
      ],
    },
  ],
};

function mockFetch(payload: unknown, ok = true) {
  global.fetch = vi.fn(async () =>
    new Response(JSON.stringify(payload), { status: ok ? 200 : 500 }),
  ) as unknown as typeof fetch;
}

beforeEach(() => mockFetch(available));

describe("<TelemetryPanel />", () => {
  it("renders per-driver stint pace on the happy path", async () => {
    render(withQuery(<TelemetryPanel year="2024" round="16" />));
    expect(await screen.findByText("LEC")).toBeInTheDocument();
    expect(screen.getByText("SOFT")).toBeInTheDocument();
    expect(screen.getByText("HARD")).toBeInTheDocument();
    // 92.456s → "1:32.456"
    expect(screen.getByText("1:32.456")).toBeInTheDocument();
    // positive slope shown as slowing (+), negative as improving
    expect(screen.getByText("+0.120 s/lap")).toBeInTheDocument();
    expect(screen.getByText("-0.050 s/lap")).toBeInTheDocument();
  });

  it("shows a graceful message when telemetry is unavailable", async () => {
    mockFetch({ available: false, reason: "No telemetry available for this race" });
    render(withQuery(<TelemetryPanel year="2008" round="3" />));
    expect(
      await screen.findByText(/no telemetry available for this race/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/openf1 for 2023 onwards/i)).toBeInTheDocument();
  });

  it("shows an error message when the request fails", async () => {
    mockFetch({}, false);
    render(withQuery(<TelemetryPanel year="2024" round="16" />));
    expect(
      await screen.findByText(/telemetry could not be loaded/i),
    ).toBeInTheDocument();
  });
});
