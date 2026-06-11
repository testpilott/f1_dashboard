import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DriverCareerSection from "@/components/drivers/sections/DriverCareerSection";

describe("<DriverCareerSection />", () => {
  it("renders career stat boxes", () => {
    render(
      <DriverCareerSection
        careerLoading={false}
        careerData={{ wins: 60, podiums: 98, starts: 210, fastestLaps: 44, championships: 4 }}
      />,
    );

    expect(screen.getByText("Career")).toBeInTheDocument();
    expect(screen.getByText("210")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("shows loading placeholders when career data is loading", () => {
    const { container } = render(<DriverCareerSection careerLoading careerData={undefined} />);
    expect(container.querySelectorAll(".h-12").length).toBe(5);
  });
});
