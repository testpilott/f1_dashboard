import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DriverBioSection from "@/components/drivers/sections/DriverBioSection";
import { makeDriver, makeDriverStanding } from "@/test/fixtures";

describe("<DriverBioSection />", () => {
  const driver = makeDriverStanding({
    Driver: makeDriver({ nationality: "Dutch" }),
  });

  it("renders nationality and age details", () => {
    render(
      <DriverBioSection
        driver={driver}
        flag="🇳🇱"
        age={27}
        wikidataLoading={false}
        birthplace={{ city: "Hasselt", wikiUrl: null }}
      />,
    );

    expect(screen.getByText(/Dutch/)).toBeInTheDocument();
    expect(screen.getByText(/Age 27/)).toBeInTheDocument();
    expect(screen.getByText("Hasselt")).toBeInTheDocument();
  });

  it("shows loading placeholder while wikidata is loading", () => {
    const { container } = render(
      <DriverBioSection
        driver={driver}
        flag="🇳🇱"
        age={null}
        wikidataLoading
        birthplace={{ city: "Hasselt", wikiUrl: null }}
      />,
    );

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(screen.queryByText("Hasselt")).not.toBeInTheDocument();
  });
});
