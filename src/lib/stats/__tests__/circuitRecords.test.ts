import { describe, expect, it } from "vitest";
import type { Race } from "@/lib/types";
import { computeCircuitRecords } from "@/lib/stats/circuitRecords";

const makeRace = (season: string, rows: Race["Results"]): Race => ({
  season,
  round: "1",
  url: "",
  raceName: "Test GP",
  Circuit: {
    circuitId: "monza",
    url: "",
    circuitName: "Monza",
    Location: { lat: "45", long: "9", locality: "Monza", country: "Italy" },
  },
  date: `${season}-09-01`,
  Results: rows,
});

describe("computeCircuitRecords", () => {
  it("computes most wins and poles", () => {
    const races: Race[] = [
      makeRace("2024", [
        {
          number: "1",
          position: "1",
          positionText: "1",
          points: "25",
          Driver: { driverId: "hamilton", permanentNumber: "44", code: "HAM", url: "", givenName: "Lewis", familyName: "Hamilton", dateOfBirth: "1985-01-07", nationality: "British" },
          Constructor: { constructorId: "mercedes", url: "", name: "Mercedes", nationality: "German" },
          grid: "1",
          laps: "53",
          status: "Finished",
          FastestLap: { rank: "1", lap: "50", Time: { time: "1:21.500" }, AverageSpeed: { units: "kph", speed: "230" } },
        },
      ]),
      makeRace("2025", [
        {
          number: "1",
          position: "1",
          positionText: "1",
          points: "25",
          Driver: { driverId: "hamilton", permanentNumber: "44", code: "HAM", url: "", givenName: "Lewis", familyName: "Hamilton", dateOfBirth: "1985-01-07", nationality: "British" },
          Constructor: { constructorId: "mercedes", url: "", name: "Mercedes", nationality: "German" },
          grid: "2",
          laps: "53",
          status: "Finished",
          FastestLap: { rank: "1", lap: "44", Time: { time: "1:21.000" }, AverageSpeed: { units: "kph", speed: "231" } },
        },
        {
          number: "16",
          position: "2",
          positionText: "2",
          points: "18",
          Driver: { driverId: "leclerc", permanentNumber: "16", code: "LEC", url: "", givenName: "Charles", familyName: "Leclerc", dateOfBirth: "1997-10-16", nationality: "Monegasque" },
          Constructor: { constructorId: "ferrari", url: "", name: "Ferrari", nationality: "Italian" },
          grid: "1",
          laps: "53",
          status: "Finished",
        },
      ]),
    ];

    const out = computeCircuitRecords(races);
    expect(out.mostWins?.driverId).toBe("hamilton");
    expect(out.mostWins?.count).toBe(2);
    expect(out.mostPoles?.driverId).toBe("hamilton");
    expect(out.mostPoles?.count).toBe(1);
    expect(out.fastestLap?.time).toBe("1:21.000");
    expect(out.fastestLap?.year).toBe(2025);
  });

  it("returns null fields for empty input", () => {
    expect(computeCircuitRecords([])).toEqual({ mostWins: null, mostPoles: null, fastestLap: null });
  });

  it("returns null fields when results are empty", () => {
    const out = computeCircuitRecords([makeRace("2024", [])]);
    expect(out).toEqual({ mostWins: null, mostPoles: null, fastestLap: null });
  });
});
