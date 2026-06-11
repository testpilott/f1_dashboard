import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RaceTimesPanel from "@/components/race/RaceTimesPanel";

describe("<RaceTimesPanel />", () => {
  it("renders race start times and circuit records", () => {
    render(
      <RaceTimesPanel
        venue="Sun, 24 May, 15:00 GMT+2"
        utc="Sun, 24 May, 13:00 UTC"
        browserLocal="Sun, May 24, 09:00 EDT"
        circuitRecords={{
          mostWins: { driverId: "senna", name: "Ayrton Senna", count: 6 },
          mostPoles: { driverId: "senna", name: "Ayrton Senna", count: 5 },
          fastestLap: { driverId: "hamilton", name: "Lewis Hamilton", time: "1:12.909", year: 2021 },
        }}
        circuitRecordsLoading={false}
      />,
    );

    expect(screen.getByText("Race Start Times")).toBeInTheDocument();
    expect(screen.getByText("Circuit Records")).toBeInTheDocument();
    expect(screen.getByText("Ayrton Senna (6)")).toBeInTheDocument();
  });

  it("shows loading skeleton while circuit records are loading", () => {
    const { container } = render(
      <RaceTimesPanel
        venue="Sun, 24 May, 15:00 GMT+2"
        utc="Sun, 24 May, 13:00 UTC"
        browserLocal="Sun, May 24, 09:00 EDT"
        circuitRecords={null}
        circuitRecordsLoading
      />,
    );

    expect(screen.getByText("Race Start Times")).toBeInTheDocument();
    expect(container.querySelector(".h-24.w-full")).not.toBeNull();
  });
});
