import { describe, it, expect } from "vitest";
import { getTeamColor, getTeamLogo, TEAM_COLORS } from "@/lib/constants/teams";

describe("getTeamColor", () => {
  it("returns the exact brand color for a known team", () => {
    expect(getTeamColor("Ferrari")).toBe(TEAM_COLORS.Ferrari);
  });
  it("resolves long constructor aliases", () => {
    expect(getTeamColor("Red Bull Racing")).toBe(getTeamColor("Red Bull"));
  });
  it("falls back to default for an unknown team", () => {
    expect(getTeamColor("Not A Team")).toBe(TEAM_COLORS.default);
  });
  it("falls back to default for empty string", () => {
    expect(getTeamColor("")).toBe(TEAM_COLORS.default);
  });
});

describe("getTeamLogo", () => {
  it("returns a local /logos path for a known team", () => {
    expect(getTeamLogo("McLaren")).toMatch(/^\/logos\/.+\.webp$/);
  });
  it("returns undefined for an unknown team", () => {
    expect(getTeamLogo("Not A Team")).toBeUndefined();
  });
});
