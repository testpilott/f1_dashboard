import { describe, it, expect } from "vitest";
import { matchOpenF1Driver } from "../driverMapping";
import type { OpenF1Driver } from "@/lib/types";

function mkDriver(overrides: Partial<OpenF1Driver>): OpenF1Driver {
  return {
    driver_number: 1,
    broadcast_name: "M.VERSTAPPEN",
    first_name: "Max",
    last_name: "Verstappen",
    full_name: "Max Verstappen",
    name_acronym: "VER",
    team_name: "Red Bull Racing",
    team_colour: "3671C6",
    headshot_url: "https://media.formula1.com/d_driver_fallback_image.png/Content/Dam/fom-website/drivers/M/MAXVER01_Max_Verstappen/maxver01.png",
    session_key: 9999,
    meeting_key: 9999,
    ...overrides,
  };
}

describe("matchOpenF1Driver", () => {
  it("matches by name_acronym (exact case-insensitive)", () => {
    const drivers = [mkDriver({ name_acronym: "VER" }), mkDriver({ driver_number: 16, name_acronym: "LEC" })];
    const result = matchOpenF1Driver(drivers, { driverId: "leclerc", code: "lec", familyName: "Leclerc" });
    expect(result?.driver_number).toBe(16);
  });

  it("matches case-insensitively — driver code uppercase, jolpica lowercase", () => {
    const drivers = [mkDriver({ name_acronym: "VER" })];
    const result = matchOpenF1Driver(drivers, { driverId: "max_verstappen", code: "VER", familyName: "Verstappen" });
    expect(result?.driver_number).toBe(1);
  });

  it("falls back to family name when acronym does not match", () => {
    const drivers = [mkDriver({ name_acronym: "MSC", last_name: "Schumacher" })];
    const result = matchOpenF1Driver(drivers, { driverId: "mick_schumacher", code: "MSC", familyName: "Schumacher" });
    expect(result?.driver_number).toBe(1);
  });

  it("returns null when no match found", () => {
    const drivers = [mkDriver({ name_acronym: "VER", last_name: "Verstappen" })];
    const result = matchOpenF1Driver(drivers, { driverId: "bottas", code: "BOT", familyName: "Bottas" });
    expect(result).toBeNull();
  });

  it("returns null for empty OpenF1 array", () => {
    const result = matchOpenF1Driver([], { driverId: "hamilton", code: "HAM", familyName: "Hamilton" });
    expect(result).toBeNull();
  });

  it("picks the right driver from a larger list", () => {
    const drivers = [
      mkDriver({ driver_number: 1, name_acronym: "VER" }),
      mkDriver({ driver_number: 44, name_acronym: "HAM" }),
      mkDriver({ driver_number: 16, name_acronym: "LEC" }),
    ];
    const result = matchOpenF1Driver(drivers, { driverId: "hamilton", code: "HAM", familyName: "Hamilton" });
    expect(result?.driver_number).toBe(44);
  });
});
