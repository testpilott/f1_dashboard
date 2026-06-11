import { describe, expect, it } from "vitest";
import { edgeCacheControl } from "@/lib/api/edgeHeaders";

describe("edgeCacheControl", () => {
  it("returns a public s-maxage directive for a known DataClass", () => {
    const header = edgeCacheControl("liveStandings");
    expect(header).toMatch(/^public, s-maxage=\d+, stale-while-revalidate=\d+$/);
  });

  it("includes a non-zero s-maxage", () => {
    const header = edgeCacheControl("seasonSchedule");
    const match = header.match(/s-maxage=(\d+)/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBeGreaterThan(0);
  });

  it("uses a larger s-maxage for weekly data than for live data", () => {
    const liveHeader = edgeCacheControl("liveStandings");
    const weeklyHeader = edgeCacheControl("careerStats");

    const liveMaxAge = Number(liveHeader.match(/s-maxage=(\d+)/)![1]);
    const weeklyMaxAge = Number(weeklyHeader.match(/s-maxage=(\d+)/)![1]);

    expect(weeklyMaxAge).toBeGreaterThan(liveMaxAge);
  });

  it("stale-while-revalidate is 7 days (604800 seconds)", () => {
    const header = edgeCacheControl("historicalResults");
    expect(header).toContain("stale-while-revalidate=604800");
  });
});
