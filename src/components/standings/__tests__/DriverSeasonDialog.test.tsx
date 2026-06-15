import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DriverSeasonDialog from "@/components/standings/DriverSeasonDialog";
import { withQuery } from "@/test/render";
import { createFetchRouter } from "@/test/fetch";
import type { DriverStanding } from "@/lib/types";

const DRIVER = {
  position: "1",
  positionText: "1",
  points: "100",
  wins: "3",
  Driver: {
    driverId: "hamilton",
    permanentNumber: "44",
    code: "HAM",
    url: "",
    givenName: "Lewis",
    familyName: "Hamilton",
    dateOfBirth: "1985-01-07",
    nationality: "British",
  },
  Constructors: [{ constructorId: "ferrari", url: "", name: "Ferrari", nationality: "Italian" }],
} as unknown as DriverStanding;

function summary(rows: unknown[] = []) {
  return {
    driverId: "hamilton",
    season: "current",
    rows,
    aggregates: {
      races: 1,
      wins: 1,
      podiums: 1,
      points: 25,
      dnfs: 0,
      fastestLaps: 0,
      avgFinish: 1,
      avgGrid: 1,
    },
  };
}

function mockSeason(body: unknown) {
  global.fetch = createFetchRouter({ "/api/driver-season": body });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("<DriverSeasonDialog />", () => {
  it("does not fetch when closed", () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    render(
      withQuery(
        <DriverSeasonDialog driver={DRIVER} season="current" open={false} onOpenChange={() => {}} />,
      ),
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not fetch when there is no driver", () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    render(
      withQuery(
        <DriverSeasonDialog driver={null} season="current" open onOpenChange={() => {}} />,
      ),
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    ["current", "Current Season"],
    ["2024", "2024 Season"],
  ])("renders correct label for season %s", async (season, expectedLabel) => {
    mockSeason({ season, driverId: "hamilton", summary: summary() });

    render(
      withQuery(
        <DriverSeasonDialog driver={DRIVER} season={season} open onOpenChange={() => {}} />,
      ),
    );

    expect(await screen.findByText(expectedLabel)).toBeInTheDocument();
    expect(await screen.findByText("HAM")).toBeInTheDocument();
  });

  it("shows the empty-state message when no race rows exist", async () => {
    mockSeason({ season: "current", driverId: "hamilton", summary: summary([]) });

    render(
      withQuery(
        <DriverSeasonDialog driver={DRIVER} season="current" open onOpenChange={() => {}} />,
      ),
    );

    expect(await screen.findByText(/No race data available yet/i)).toBeInTheDocument();
  });

  it("renders an error message when the request fails", async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: "boom" }), { status: 500 }),
    ) as unknown as typeof fetch;

    render(
      withQuery(
        <DriverSeasonDialog driver={DRIVER} season="current" open onOpenChange={() => {}} />,
      ),
    );

    expect(await screen.findByText(/Failed to load season data/i)).toBeInTheDocument();
  });

  it("shows the results-feed lag banner with the formatted interval", async () => {
    mockSeason({
      season: "current",
      driverId: "hamilton",
      summary: summary(),
      resultsFeedLag: {
        pendingRaceNames: ["Monaco Grand Prix"],
        pendingRounds: [4],
        checkAgainAfterMs: 10 * 60 * 1000,
        asOf: "2026-06-14T00:00:00.000Z",
      },
    });

    render(
      withQuery(
        <DriverSeasonDialog driver={DRIVER} season="current" open onOpenChange={() => {}} />,
      ),
    );

    await waitFor(() =>
      expect(
        screen.getByText(/Monaco Grand Prix.*Auto-checking every 10 minutes\./),
      ).toBeInTheDocument(),
    );
  });
});
