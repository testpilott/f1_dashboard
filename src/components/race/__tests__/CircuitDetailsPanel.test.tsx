import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CircuitDetailsPanel from "@/components/race/CircuitDetailsPanel";
import type { CircuitDetails } from "@/lib/constants/circuitDetails";

const FULL_DETAILS: CircuitDetails = {
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
      description: "Steep uphill — taken near-flat.",
    },
    {
      corner: 8,
      name: "Les Combes",
      description: "Heavy braking after Kemmel.",
    },
  ],
};

const FLAT_NO_HOTSPOTS: CircuitDetails = {
  ...FULL_DETAILS,
  notableHotspots: [],
};

describe("<CircuitDetailsPanel />", () => {
  it("renders nothing when details is undefined", () => {
    const { container } = render(
      <CircuitDetailsPanel circuitId="spa" details={undefined} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders length, turns, elevation, and banking", () => {
    render(<CircuitDetailsPanel circuitId="spa" details={FULL_DETAILS} />);
    expect(screen.getByText("Length")).toBeInTheDocument();
    expect(screen.getByText("7,004 m")).toBeInTheDocument();
    expect(screen.getByText("Turns")).toBeInTheDocument();
    expect(screen.getByText("19")).toBeInTheDocument();
    expect(screen.getByText("Elevation")).toBeInTheDocument();
    expect(screen.getByText("102 m")).toBeInTheDocument();
    expect(screen.getByText("Max bank")).toBeInTheDocument();
    expect(screen.getByText("0°")).toBeInTheDocument();
  });

  it("renders a secure outbound Wikipedia link for a known circuit", () => {
    render(<CircuitDetailsPanel circuitId="spa" details={FULL_DETAILS} />);
    const link = screen.getByRole("link", { name: /wikipedia/i });
    expect(link).toHaveAttribute(
      "href",
      "https://en.wikipedia.org/wiki/Circuit_de_Spa-Francorchamps",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("hides the Wikipedia link for an unseeded circuit even when details are passed in", () => {
    render(
      <CircuitDetailsPanel circuitId="not_a_real_circuit" details={FULL_DETAILS} />,
    );
    expect(screen.queryByRole("link", { name: /wikipedia/i })).toBeNull();
  });

  it("renders every notable corner with its name and description", () => {
    render(<CircuitDetailsPanel circuitId="spa" details={FULL_DETAILS} />);
    expect(screen.getByText(/T3 — Eau Rouge–Raidillon/)).toBeInTheDocument();
    expect(screen.getByText("Steep uphill — taken near-flat.")).toBeInTheDocument();
    expect(screen.getByText(/T8 — Les Combes/)).toBeInTheDocument();
  });

  it("omits the Notable corners section when the list is empty", () => {
    render(<CircuitDetailsPanel circuitId="spa" details={FLAT_NO_HOTSPOTS} />);
    expect(screen.queryByText(/Notable corners/i)).toBeNull();
    // Stats still render
    expect(screen.getByText("Length")).toBeInTheDocument();
  });
});
