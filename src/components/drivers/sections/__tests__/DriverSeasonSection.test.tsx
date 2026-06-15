import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DriverSeasonSection, {
  type DriverSeasonData,
} from "@/components/drivers/sections/DriverSeasonSection";

const baseSummary: DriverSeasonData["summary"] = {
  driverId: "verstappen",
  season: "2026",
  rows: [],
  aggregates: {
    races: 2,
    wins: 1,
    podiums: 2,
    points: 43,
    dnfs: 0,
    fastestLaps: 1,
    avgFinish: 1.5,
    avgGrid: 2,
  },
};

function makeStats(overrides: Partial<DriverSeasonData> = {}): DriverSeasonData {
  return {
    season: "2026",
    driverId: "verstappen",
    summary: baseSummary,
    ...overrides,
  };
}

function makeLag(checkAgainAfterMs: number, pendingRaceNames = ["Monaco Grand Prix"]) {
  return {
    pendingRaceNames,
    pendingRounds: [4],
    checkAgainAfterMs,
    asOf: "2026-06-14T00:00:00.000Z",
  };
}

describe("<DriverSeasonSection />", () => {
  it("shows three skeleton placeholders while loading", () => {
    const { container } = render(<DriverSeasonSection seasonLoading seasonStats={undefined} />);
    expect(container.querySelectorAll(".h-12")).toHaveLength(3);
  });

  it("renders the header but no lag banner when no stats and not loading", () => {
    render(<DriverSeasonSection seasonLoading={false} seasonStats={undefined} />);
    expect(screen.getByText("This Season")).toBeInTheDocument();
    expect(screen.queryByText(/Results feed update pending/i)).not.toBeInTheDocument();
  });

  it("does not show the lag banner when there is no resultsFeedLag", () => {
    render(<DriverSeasonSection seasonLoading={false} seasonStats={makeStats()} />);
    expect(screen.queryByText(/Results feed update pending/i)).not.toBeInTheDocument();
  });

  it("lists every pending race name in the lag banner", () => {
    render(
      <DriverSeasonSection
        seasonLoading={false}
        seasonStats={makeStats({
          resultsFeedLag: makeLag(10 * 60 * 1000, ["Monaco Grand Prix", "Spanish Grand Prix"]),
        })}
      />,
    );
    expect(screen.getByText(/Monaco Grand Prix, Spanish Grand Prix/)).toBeInTheDocument();
  });

  // ── formatLagInterval edge cases, exercised via rendered copy ────────────────
  it.each([
    [60 * 1000, "1 minute"],
    [10 * 60 * 1000, "10 minutes"],
    [60 * 60 * 1000, "1 hour"],
    [90 * 60 * 1000, "2 hours"],
  ])("formats %dms as '%s'", (ms, expected) => {
    render(
      <DriverSeasonSection
        seasonLoading={false}
        seasonStats={makeStats({ resultsFeedLag: makeLag(ms) })}
      />,
    );
    expect(
      screen.getByText(new RegExp(`Auto-checking every ${expected}\\.`)),
    ).toBeInTheDocument();
  });

  it.each([
    [0],
    [-5],
    [Number.NaN],
  ])("falls back to 'about an hour' for invalid interval %p", (ms) => {
    render(
      <DriverSeasonSection
        seasonLoading={false}
        seasonStats={makeStats({ resultsFeedLag: makeLag(ms) })}
      />,
    );
    expect(screen.getByText(/Auto-checking every about an hour\./)).toBeInTheDocument();
  });
});
