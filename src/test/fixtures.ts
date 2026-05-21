import type {
  Constructor,
  ConstructorStanding,
  Driver,
  DriverStanding,
  Race,
  RaceResult,
} from "@/lib/types";

export function makeDriver(overrides: Partial<Driver> = {}): Driver {
  return {
    driverId: "test_driver",
    permanentNumber: "99",
    code: "TST",
    url: "",
    givenName: "Test",
    familyName: "Driver",
    dateOfBirth: "1990-01-01",
    nationality: "Test",
    ...overrides,
  };
}

export function makeConstructor(overrides: Partial<Constructor> = {}): Constructor {
  return {
    constructorId: "test_constructor",
    url: "",
    name: "Test Constructor",
    nationality: "Test",
    ...overrides,
  };
}

export function makeRaceResult(overrides: Partial<RaceResult> = {}): RaceResult {
  return {
    number: "99",
    position: "99",
    positionText: "99",
    points: "0",
    Driver: makeDriver(),
    Constructor: makeConstructor(),
    grid: "0",
    laps: "0",
    status: "Finished",
    ...overrides,
  } as RaceResult;
}

export function makeRace(overrides: Partial<Race> = {}): Race {
  return {
    season: "2026",
    round: "1",
    url: "",
    raceName: "Test Grand Prix",
    Circuit: {
      circuitId: "test",
      url: "",
      circuitName: "Test Circuit",
      Location: { lat: "0", long: "0", locality: "Test", country: "Test" },
    },
    date: "2026-03-01",
    time: "14:00:00Z",
    Results: [],
    ...overrides,
  };
}

export function makeDriverStanding(overrides: Partial<DriverStanding> = {}): DriverStanding {
  return {
    position: "1",
    positionText: "1",
    points: "0",
    wins: "0",
    Driver: makeDriver(),
    Constructors: [makeConstructor()],
    ...overrides,
  };
}

export function makeConstructorStanding(
  overrides: Partial<ConstructorStanding> = {},
): ConstructorStanding {
  return {
    position: "1",
    positionText: "1",
    points: "0",
    wins: "0",
    Constructor: makeConstructor(),
    ...overrides,
  };
}