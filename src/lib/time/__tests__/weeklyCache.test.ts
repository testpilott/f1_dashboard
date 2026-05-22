import { describe, expect, it } from "vitest";
import { currentEtWeekBucket } from "@/lib/time/weeklyCache";

describe("currentEtWeekBucket", () => {
  it("returns same Monday bucket for dates within the same ET week", () => {
    const mondayEt = new Date("2026-05-11T04:00:00.000Z"); // Mon 00:00 ET
    const thursdayEt = new Date("2026-05-14T20:30:00.000Z"); // Thu 16:30 ET

    expect(currentEtWeekBucket(mondayEt)).toBe("2026-05-11");
    expect(currentEtWeekBucket(thursdayEt)).toBe("2026-05-11");
  });

  it("rolls over to a new bucket at Monday midnight ET", () => {
    const sundayLateEt = new Date("2026-05-18T03:59:59.000Z"); // Sun 23:59:59 ET
    const mondayStartEt = new Date("2026-05-18T04:00:00.000Z"); // Mon 00:00:00 ET

    expect(currentEtWeekBucket(sundayLateEt)).toBe("2026-05-11");
    expect(currentEtWeekBucket(mondayStartEt)).toBe("2026-05-18");
  });

  it("handles DST periods consistently", () => {
    const winter = new Date("2026-01-07T15:00:00.000Z");
    const summer = new Date("2026-07-08T15:00:00.000Z");

    expect(currentEtWeekBucket(winter)).toBe("2026-01-05");
    expect(currentEtWeekBucket(summer)).toBe("2026-07-06");
  });
});
