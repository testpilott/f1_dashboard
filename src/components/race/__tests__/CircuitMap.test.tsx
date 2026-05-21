import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import CircuitMap from "@/components/race/CircuitMap";
import { withQuery } from "@/test/render";
import { createFetchRouter } from "@/test/fetch";

// Minimal valid 4-point square track — satisfies TrackSVG's xs.length >= 2 guard
const CIRCUIT_INFO = {
  available: true,
  circuitName: "Silverstone Circuit",
  country: "UK",
  locality: "Silverstone",
  corners: [],
  trackX: [0, 100, 100, 0],
  trackY: [0, 0, 100, 100],
  trackPositionTime: [],
  rotation: 0,
};

const CIRCUIT_UNAVAILABLE = {
  available: false,
  reason: "Circuit map unavailable for this session.",
};

const INCIDENTS_WITH_DATA = {
  available: true,
  incidents: [
    {
      x: 50,
      y: 50,
      lap_number: 12,
      driver_number: 44,
      flag: "YELLOW",
      category: "Flag",
      message: "Yellow flag at Turn 6",
    },
    {
      x: 80,
      y: 80,
      lap_number: 30,
      driver_number: 1,
      flag: "RED",
      category: "Flag",
      message: "Red flag — debris on track",
    },
  ],
};

const INCIDENTS_EMPTY = { available: false };

/**
 * Routes fetch calls to the right fixture by URL substring.
 * Both queries fire in useQuery; order is non-deterministic so we match by URL.
 */
function mockFetch(circuitPayload: unknown, incidentsPayload: unknown) {
  global.fetch = createFetchRouter({
    "circuit-info": circuitPayload,
    "race-incidents": incidentsPayload,
  });
}

beforeEach(() => mockFetch(CIRCUIT_INFO, INCIDENTS_WITH_DATA));

describe("<CircuitMap />", () => {
  // ── Availability / error states ────────────────────────────────────────────

  it("shows reason text when circuit is unavailable", async () => {
    mockFetch(CIRCUIT_UNAVAILABLE, INCIDENTS_EMPTY);
    render(withQuery(<CircuitMap year="2024" round="5" />));
    expect(
      await screen.findByText(/circuit map unavailable for this session/i),
    ).toBeInTheDocument();
  });

  it("shows fallback message when circuit-info fetch fails", async () => {
    global.fetch = vi.fn(async () => new Response("{}", { status: 500 })) as unknown as typeof fetch;
    render(withQuery(<CircuitMap year="2024" round="5" />));
    expect(
      await screen.findByText(/circuit map unavailable/i),
    ).toBeInTheDocument();
  });

  // ── Incident markers rendered ──────────────────────────────────────────────

  it("shows incident count text when incidents are returned", async () => {
    render(withQuery(<CircuitMap year="2024" round="5" />));
    expect(
      await screen.findByText(/2 incident markers — click to view detail/i),
    ).toBeInTheDocument();
  });

  it("renders each incident as an accessible button", async () => {
    render(withQuery(<CircuitMap year="2024" round="5" />));
    const firstMarker = await screen.findByRole("button", {
      name: /Incident: Yellow flag at Turn 6/i,
    });
    const secondMarker = await screen.findByRole("button", {
      name: /Incident: Red flag — debris on track/i,
    });
    expect(firstMarker).toBeInTheDocument();
    expect(secondMarker).toBeInTheDocument();
  });

  it("shows no incident count text when incidents are unavailable", async () => {
    mockFetch(CIRCUIT_INFO, INCIDENTS_EMPTY);
    render(withQuery(<CircuitMap year="2024" round="5" />));
    // Wait for circuit to render (SVG should appear via aria-label)
    await screen.findByRole("img", { name: /Silverstone Circuit/i });
    expect(screen.queryByText(/incident marker/i)).not.toBeInTheDocument();
  });

  // ── Marker click → dialog ─────────────────────────────────────────────────

  it("clicking a marker opens the incident detail dialog", async () => {
    const user = userEvent.setup();
    render(withQuery(<CircuitMap year="2024" round="5" />));

    const marker = await screen.findByRole("button", {
      name: /Incident: Yellow flag at Turn 6/i,
    });
    await user.click(marker);

    // Dialog is open
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    // Dialog title reflects flag type
    expect(screen.getByText("YELLOW Flag")).toBeInTheDocument();

    // Incident details are rendered
    expect(screen.getByText("12")).toBeInTheDocument(); // lap_number
    expect(screen.getByText("44")).toBeInTheDocument(); // driver_number
    expect(screen.getByText("YELLOW")).toBeInTheDocument(); // flag
    expect(screen.getByText("Yellow flag at Turn 6")).toBeInTheDocument(); // message
  });

  it("dialog title for CarEvent shows 'Incident' not the flag value", async () => {
    const user = userEvent.setup();
    mockFetch(CIRCUIT_INFO, {
      available: true,
      incidents: [
        {
          x: 50,
          y: 50,
          lap_number: 7,
          driver_number: 16,
          flag: null,
          category: "CarEvent",
          message: "Car off at Turn 4",
        },
      ],
    });
    render(withQuery(<CircuitMap year="2024" round="5" />));

    const marker = await screen.findByRole("button", {
      name: /Incident: Car off at Turn 4/i,
    });
    await user.click(marker);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Incident")).toBeInTheDocument();
    expect(screen.getByText("Car off at Turn 4")).toBeInTheDocument();
  });

  // ── Dialog close ──────────────────────────────────────────────────────────

  it("closes the dialog when the Close button is clicked", async () => {
    const user = userEvent.setup();
    render(withQuery(<CircuitMap year="2024" round="5" />));

    const marker = await screen.findByRole("button", {
      name: /Incident: Yellow flag at Turn 6/i,
    });
    await user.click(marker);
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("button", { name: /close/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("closes the dialog on Escape key", async () => {
    const user = userEvent.setup();
    render(withQuery(<CircuitMap year="2024" round="5" />));

    const marker = await screen.findByRole("button", {
      name: /Incident: Yellow flag at Turn 6/i,
    });
    await user.click(marker);
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  // ── Keyboard access ───────────────────────────────────────────────────────

  it("opens the dialog on Enter key on a marker", async () => {
    const user = userEvent.setup();
    render(withQuery(<CircuitMap year="2024" round="5" />));

    const marker = await screen.findByRole("button", {
      name: /Incident: Yellow flag at Turn 6/i,
    });
    marker.focus();
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
