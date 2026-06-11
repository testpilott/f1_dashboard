import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DriverQuotesSection from "@/components/drivers/sections/DriverQuotesSection";

describe("<DriverQuotesSection />", () => {
  it("renders quote cards with source metadata", () => {
    render(
      <DriverQuotesSection
        color="var(--f1-red)"
        quotes={[
          {
            text: "Push now, push now.",
            source: { race: "Monaco Grand Prix", year: 2021 },
          },
        ]}
      />,
    );

    expect(screen.getByText(/Memorable Quotes/)).toBeInTheDocument();
    expect(screen.getByText(/Push now, push now/)).toBeInTheDocument();
    expect(screen.getByText(/Monaco Grand Prix/)).toBeInTheDocument();
  });

  it("renders multiple quotes", () => {
    render(
      <DriverQuotesSection
        color="var(--f1-red)"
        quotes={[
          { text: "A", source: { race: "R1", year: 2020 } },
          { text: "B", source: { race: "R2", year: 2021 } },
        ]}
      />,
    );

    expect(screen.getByText(/A/)).toBeInTheDocument();
    expect(screen.getByText(/B/)).toBeInTheDocument();
  });
});
