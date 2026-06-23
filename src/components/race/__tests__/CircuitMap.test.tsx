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

  // ── Curated hotspots (Phase 5) ────────────────────────────────────────────

  it("renders hotspot markers from circuit details + corner geometry join", async () => {
    mockFetch(
      {
        ...CIRCUIT_INFO,
        circuitId: "spa",
        corners: [
          { number: 3, x: 30, y: 30, length: 100 },
          { number: 8, x: 60, y: 60, length: 500 },
        ],
        details: {
          lengthMeters: 7004,
          turnCount: 19,
          elevationGainMeters: 102,
          maxBankingDegrees: 0,
          direction: "clockwise",
          wikipediaSlug: "Circuit_de_Spa-Francorchamps",
          notableHotspots: [
            { corner: 3, name: "Eau Rouge–Raidillon", description: "Iconic uphill." },
            { corner: 8, name: "Les Combes", description: "Heavy braking zone." },
            // Hotspot for a corner not present in the route corners[] — silently skipped
            { corner: 99, name: "Phantom", description: "Should not render." },
          ],
        },
      },
      INCIDENTS_EMPTY,
    );
    render(withQuery(<CircuitMap year="2024" round="5" />));

    const eauRouge = await screen.findByRole("button", {
      name: /Notable corner: Eau Rouge–Raidillon/i,
    });
    expect(eauRouge).toHaveAttribute("data-marker-type", "hotspot");

    expect(
      screen.getByRole("button", { name: /Notable corner: Les Combes/i }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: /Notable corner: Phantom/i }),
    ).toBeNull();
  });

  it("shows the hotspot's name + description in the dialog when clicked", async () => {
    mockFetch(
      {
        ...CIRCUIT_INFO,
        circuitId: "spa",
        corners: [{ number: 3, x: 30, y: 30, length: 100 }],
        details: {
          lengthMeters: 7004,
          turnCount: 19,
          elevationGainMeters: 102,
          maxBankingDegrees: 0,
          direction: "clockwise",
          wikipediaSlug: "Circuit_de_Spa-Francorchamps",
          notableHotspots: [
            {
              corner: 3,
              name: "Eau Rouge–Raidillon",
              description: "Iconic uphill — taken near-flat.",
            },
          ],
        },
      },
      INCIDENTS_EMPTY,
    );

    const user = userEvent.setup();
    render(withQuery(<CircuitMap year="2024" round="5" />));

    const marker = await screen.findByRole("button", {
      name: /Notable corner: Eau Rouge–Raidillon/i,
    });
    await user.click(marker);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    // Name appears in the dialog title + the panel list — two hits is expected.
    expect(screen.getAllByText(/Eau Rouge–Raidillon/).length).toBeGreaterThanOrEqual(2);
    // Description also appears in both the panel and the dialog body.
    expect(
      screen.getAllByText("Iconic uphill — taken near-flat.").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("renders the combined count text when both incidents and hotspots are present", async () => {
    mockFetch(
      {
        ...CIRCUIT_INFO,
        circuitId: "spa",
        corners: [{ number: 3, x: 30, y: 30, length: 100 }],
        details: {
          lengthMeters: 7004,
          turnCount: 19,
          elevationGainMeters: 102,
          maxBankingDegrees: 0,
          direction: "clockwise",
          wikipediaSlug: "Circuit_de_Spa-Francorchamps",
          notableHotspots: [
            { corner: 3, name: "Eau Rouge", description: "Iconic." },
          ],
        },
      },
      INCIDENTS_WITH_DATA,
    );
    render(withQuery(<CircuitMap year="2024" round="5" />));
    expect(
      await screen.findByText(/2 incidents · 1 notable corner — click to view detail/i),
    ).toBeInTheDocument();
  });
});
