import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DriverSeasonSection from "@/components/drivers/sections/DriverSeasonSection";

describe("<DriverSeasonSection />", () => {
  it("renders season summary stats", () => {
    render(
      <DriverSeasonSection
        seasonLoading={false}
        seasonStats={{
          season: "2026",
          driverId: "verstappen",
          summary: {
            driverId: "verstappen",
            season: "2026",
            rows: [],
            aggregates: {
              races: 2,
              wins: 1,
              podiums: 2,
              points: 43,
              dnfs: 0,
              fastestLaps: 1,
              avgFinish: 1.5,
              avgGrid: 2,
            },
          },
        }}
      />,
    );

    expect(screen.getByText("This Season")).toBeInTheDocument();
    expect(screen.getByText("43")).toBeInTheDocument();
  });

  it("shows loading placeholders when season data is loading", () => {
    const { container } = render(<DriverSeasonSection seasonLoading seasonStats={undefined} />);
    expect(container.querySelectorAll(".h-12").length).toBe(3);
  });
});
