import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DriverDetailPanel from "@/components/drivers/DriverDetailPanel";
import { makeConstructor, makeDriver, makeDriverStanding } from "@/test/fixtures";

describe("<DriverDetailPanel />", () => {
  it("renders season and career sections with loaded data", () => {
    const driver = makeDriverStanding({
      Driver: makeDriver({ driverId: "verstappen", givenName: "Max", familyName: "Verstappen", code: "VER" }),
      Constructors: [makeConstructor({ constructorId: "red_bull", name: "Red Bull Racing" })],
      position: "1",
      points: "100",
      wins: "3",
    });

    render(
      <DriverDetailPanel
        driver={driver}
        news={[]}
        newsLoading={false}
        seasonLoading={false}
        seasonStats={{
          season: "2026",
          driverId: "verstappen",
          summary: {
            driverId: "verstappen",
            season: "2026",
            rows: [
              {
                round: 1,
                raceName: "Test Grand Prix",
                grid: 1,
                finish: 1,
                points: 25,
                status: "Finished",
                fastestLap: false,
              },
            ],
            aggregates: {
              races: 1,
              wins: 1,
              podiums: 1,
              points: 25,
              dnfs: 0,
              fastestLaps: 0,
              avgFinish: 1,
              avgGrid: 1,
            },
          },
        }}
        careerLoading={false}
        careerData={{ wins: 60, podiums: 98, starts: 210, fastestLaps: 44, championships: 4 }}
        onClose={() => undefined}
      />,
    );

    expect(screen.getByText("This Season")).toBeInTheDocument();
    expect(screen.getByText("Career")).toBeInTheDocument();
    expect(screen.getByText("210")).toBeInTheDocument();
  });
});