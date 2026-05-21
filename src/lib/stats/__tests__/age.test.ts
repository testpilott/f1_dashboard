import { describe, expect, it } from "vitest";
import { ageFromDateOfBirth } from "@/lib/stats/age";

describe("ageFromDateOfBirth", () => {
  it("computes age when birthday has passed this year", () => {
    const now = new Date("2026-10-01T00:00:00Z");
    expect(ageFromDateOfBirth("1997-09-30", now)).toBe(29);
  });

  it("computes age when birthday has not yet occurred this year", () => {
    const now = new Date("2026-09-01T00:00:00Z");
    expect(ageFromDateOfBirth("1997-09-30", now)).toBe(28);
  });
});