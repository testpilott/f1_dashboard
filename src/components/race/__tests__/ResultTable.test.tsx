import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ResultTable from "@/components/race/ResultTable";
import type { RaceResult } from "@/lib/types";

const raceResult: RaceResult = {
  number: "1",
  position: "1",
  positionText: "1",
  points: "25",
  Driver: {
    driverId: "verstappen",
    permanentNumber: "1",
    code: "VER",
    url: "",
    givenName: "Max",
    familyName: "Verstappen",
    dateOfBirth: "1997-09-30",
    nationality: "Dutch",
  },
  Constructor: { constructorId: "red_bull", url: "", name: "Red Bull Racing", nationality: "Austrian" },
  grid: "1",
  laps: "78",
  status: "Finished",
};

describe("<ResultTable />", () => {
  it("renders race rows when data exists", () => {
    render(<ResultTable type="race" title="Race results" initialData={[raceResult]} />);

    expect(screen.getByText(/Verstappen/)).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("renders an empty state when no rows are available", () => {
    render(<ResultTable type="race" title="Race results" initialData={[]} />);

    expect(screen.getByText("No race results available.")).toBeInTheDocument();
  });
});
