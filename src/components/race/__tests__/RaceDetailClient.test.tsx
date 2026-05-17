import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import RaceDetailClient from "@/components/race/RaceDetailClient";
import type { Race, RaceResult, QualifyingResult } from "@/lib/types";

vi.mock("@/components/race/LapChart", () => ({ default: () => <div data-testid="lap-chart" /> }));
vi.mock("@/components/race/TireStrategy", () => ({
  default: () => <div data-testid="tire-strategy" />,
}));

const mockRace: Race = {
  season: "2026",
  round: "8",
  url: "",
  raceName: "Monaco Grand Prix",
  Circuit: {
    circuitId: "monaco",
    url: "",
    circuitName: "Circuit de Monaco",
    Location: { lat: "43.7347", long: "7.4206", locality: "Monte-Carlo", country: "Monaco" },
  },
  date: "2026-05-24",
  time: "13:00:00Z",
};

const mockRaceResult: RaceResult = {
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

describe("<RaceDetailClient />", () => {
  it("renders race name and circuit info", () => {
    render(
      <RaceDetailClient
        initialData={{
          raceInfo: mockRace,
          raceResults: [mockRaceResult],
          qualifyingResults: [] as QualifyingResult[],
          sprintResults: [],
        }}
      />
    );
    expect(screen.getByText("Monaco Grand Prix")).toBeInTheDocument();
    expect(screen.getByText(/Circuit de Monaco/)).toBeInTheDocument();
  });

  it("shows driver result in the race table", () => {
    render(
      <RaceDetailClient
        initialData={{
          raceInfo: mockRace,
          raceResults: [mockRaceResult],
          qualifyingResults: [] as QualifyingResult[],
          sprintResults: [],
        }}
      />
    );
    expect(screen.getByText(/Verstappen/)).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("shows empty state when no race info", () => {
    render(
      <RaceDetailClient
        initialData={{ raceInfo: null, raceResults: [], qualifyingResults: [], sprintResults: [] }}
      />
    );
    expect(screen.getByText(/race details unavailable/i)).toBeInTheDocument();
  });
});
