import { describe, it, expect } from "vitest";
import { driverSeasonSummary } from "../driverSeason";
import { makeRace } from "@/test/fixtures";

const BASE_DRIVER = {
  driverId: "driver1",
  permanentNumber: "1",
  code: "DRV",
  url: "",
  givenName: "Test",
  familyName: "Driver",
  dateOfBirth: "1990-01-01",
  nationality: "British",
};

const BASE_CONSTRUCTOR = {
  constructorId: "team1",
  url: "",
  name: "Test Team",
  nationality: "British",
};

describe("driverSeasonSummary", () => {
  it("returns empty aggregates for no matching races", () => {
    const summary = driverSeasonSummary([], "driver1");
    expect(summary.rows).toHaveLength(0);
    expect(summary.aggregates.races).toBe(0);
    expect(summary.aggregates.wins).toBe(0);
    expect(summary.aggregates.points).toBe(0);
  });

  it("skips races where driver did not participate", () => {
    const races = [
      makeRace({
        round: "1",
        Results: [
          {
            number: "2",
            position: "1",
            positionText: "1",
            points: "25",
            Driver: { ...BASE_DRIVER, driverId: "other_driver" },
            Constructor: BASE_CONSTRUCTOR,
            grid: "1",
            laps: "57",
            status: "Finished",
          },
        ],
      }),
    ];
    const summary = driverSeasonSummary(races, "driver1");
    expect(summary.rows).toHaveLength(0);
  });

  it("counts wins, podiums, and points correctly", () => {
    const races = [
      makeRace({
        round: "1",
        raceName: "Race 1",
        Results: [
          {
            number: "1",
            position: "1",
            positionText: "1",
            points: "25",
            Driver: BASE_DRIVER,
            Constructor: BASE_CONSTRUCTOR,
            grid: "2",
            laps: "57",
            status: "Finished",
          },
        ],
      }),
      makeRace({
        round: "2",
        raceName: "Race 2",
        Results: [
          {
            number: "1",
            position: "3",
            positionText: "3",
            points: "15",
            Driver: BASE_DRIVER,
            Constructor: BASE_CONSTRUCTOR,
            grid: "3",
            laps: "57",
            status: "Finished",
          },
        ],
      }),
    ];
    const summary = driverSeasonSummary(races, "driver1");
    expect(summary.aggregates.races).toBe(2);
    expect(summary.aggregates.wins).toBe(1);
    expect(summary.aggregates.podiums).toBe(2);
    expect(summary.aggregates.points).toBe(40);
    expect(summary.aggregates.dnfs).toBe(0);
  });

  it("detects DNFs correctly — not Finished and not +N Lap", () => {
    const races = [
      makeRace({
        round: "1",
        Results: [
          {
            number: "1",
            position: "20",
            positionText: "R",
            points: "0",
            Driver: BASE_DRIVER,
            Constructor: BASE_CONSTRUCTOR,
            grid: "5",
            laps: "30",
            status: "Engine",
          },
        ],
      }),
      makeRace({
        round: "2",
        Results: [
          {
            number: "1",
            position: "15",
            positionText: "15",
            points: "0",
            Driver: BASE_DRIVER,
            Constructor: BASE_CONSTRUCTOR,
            grid: "12",
            laps: "57",
            status: "+1 Lap",
          },
        ],
      }),
    ];
    const summary = driverSeasonSummary(races, "driver1");
    expect(summary.aggregates.dnfs).toBe(1); // Engine = DNF; +1 Lap = not DNF
  });

  it("marks fastest lap from FastestLap.rank === '1'", () => {
    const races = [
      makeRace({
        round: "1",
        Results: [
          {
            number: "1",
            position: "5",
            positionText: "5",
            points: "10",
            Driver: BASE_DRIVER,
            Constructor: BASE_CONSTRUCTOR,
            grid: "4",
            laps: "57",
            status: "Finished",
            FastestLap: { rank: "1", lap: "45", Time: { time: "1:30.123" }, AverageSpeed: { units: "kph", speed: "220" } },
          },
        ],
      }),
    ];
    const summary = driverSeasonSummary(races, "driver1");
    expect(summary.aggregates.fastestLaps).toBe(1);
    expect(summary.rows[0].fastestLap).toBe(true);
  });

  it("treats a race with no Results array as a skip (no row, no aggregate)", () => {
    // Some upstream payloads omit Results entirely when no driver has been
    // classified yet. The aggregator must tolerate that without throwing.
    const races = [
      makeRace({ round: "1", Results: undefined as unknown as never }),
      makeRace({
        round: "2",
        Results: [
          {
            number: "1",
            position: "1",
            positionText: "1",
            points: "25",
            Driver: BASE_DRIVER,
            Constructor: BASE_CONSTRUCTOR,
            grid: "2",
            laps: "57",
            status: "Finished",
          },
        ],
      }),
    ];
    const summary = driverSeasonSummary(races, "driver1");
    expect(summary.rows).toHaveLength(1);
    expect(summary.aggregates.wins).toBe(1);
    expect(summary.aggregates.races).toBe(1);
  });

  it("does not over-count podiums when finish is the parser's 99 fallback", () => {
    // Regression guard for the single-pass aggregator: `finish === 99`
    // (parsePosition's fallback for "R" / non-numeric positions) must NOT
    // count as a podium. The old filter `r.finish <= 3` happened to be
    // safe because 99 > 3; this test pins that behaviour explicitly so a
    // future refactor that uses `r.finish < 4` doesn't quietly regress.
    const races = [
      makeRace({
        round: "1",
        Results: [
          {
            number: "1",
            position: "R", // unparseable → 99
            positionText: "R",
            points: "0",
            Driver: BASE_DRIVER,
            Constructor: BASE_CONSTRUCTOR,
            grid: "5",
            laps: "10",
            status: "Engine",
          },
        ],
      }),
    ];
    const summary = driverSeasonSummary(races, "driver1");
    expect(summary.aggregates.podiums).toBe(0);
    expect(summary.aggregates.wins).toBe(0);
    expect(summary.aggregates.dnfs).toBe(1);
    expect(summary.aggregates.avgFinish).toBe(0); // 99 excluded from finish denom
  });

  it("computes avgFinish and avgGrid correctly", () => {
    const races = [
      makeRace({
        round: "1",
        Results: [{ number: "1", position: "2", positionText: "2", points: "18", Driver: BASE_DRIVER, Constructor: BASE_CONSTRUCTOR, grid: "3", laps: "57", status: "Finished" }],
      }),
      makeRace({
        round: "2",
        Results: [{ number: "1", position: "4", positionText: "4", points: "12", Driver: BASE_DRIVER, Constructor: BASE_CONSTRUCTOR, grid: "5", laps: "57", status: "Finished" }],
      }),
    ];
    const summary = driverSeasonSummary(races, "driver1");
    expect(summary.aggregates.avgFinish).toBe(3); // (2+4)/2
    expect(summary.aggregates.avgGrid).toBe(4); // (3+5)/2
  });
});
