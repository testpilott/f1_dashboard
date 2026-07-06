import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RaceResultPanel from "@/components/schedule/RaceResultPanel";
import { withQuery } from "@/test/render";
import { makeRaceResult, makeDriver, makeConstructor } from "@/test/fixtures";

const winner = makeRaceResult({
  position: "1",
  positionText: "1",
  points: "25",
  status: "Finished",
  Time: { millis: "5400000", time: "1:30:00.000" },
  Driver: makeDriver({ driverId: "verstappen", code: "VER", givenName: "Max", familyName: "Verstappen" }),
  Constructor: makeConstructor({ constructorId: "red_bull", name: "Red Bull Racing" }),
});

const dnf = makeRaceResult({
  position: "20",
  positionText: "R",
  points: "0",
  status: "Collision",
  Driver: makeDriver({ driverId: "stroll", code: "STR", givenName: "Lance", familyName: "Stroll" }),
  Constructor: makeConstructor({ constructorId: "aston_martin", name: "Aston Martin" }),
});

function mockResults(payload: unknown, status = 200) {
  global.fetch = vi.fn(async () =>
    new Response(JSON.stringify(payload), { status }),
  ) as unknown as typeof fetch;
}

describe("<RaceResultPanel />", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the classification with winner time, points, and a DNF badge", async () => {
    mockResults({ results: [winner, dnf] });
    render(withQuery(<RaceResultPanel season="2026" round="5" />));

    expect(await screen.findByText("Max Verstappen")).toBeInTheDocument();
    expect(screen.getByText("1:30:00.000")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
    // The retired driver's position renders as the DNF status badge, not a number.
    expect(screen.getByText("Lance Stroll")).toBeInTheDocument();
    expect(screen.getByText("DNF")).toBeInTheDocument();
    expect(screen.queryByText("20")).not.toBeInTheDocument();
  });

  it("requests the results for the given season and round", async () => {
    mockResults({ results: [winner] });
    render(withQuery(<RaceResultPanel season="2025" round="12" />));

    await screen.findByText("Max Verstappen");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/results?season=2025&round=12"),
      expect.any(Object),
    );
  });

  it("shows a pending message when the feed has no results yet", async () => {
    mockResults({ results: [] });
    render(withQuery(<RaceResultPanel season="2026" round="5" />));

    expect(await screen.findByText(/results not yet available/i)).toBeInTheDocument();
  });

  it("shows an error message when the request fails", async () => {
    mockResults({ error: "boom" }, 500);
    render(withQuery(<RaceResultPanel season="2026" round="5" />));

    expect(await screen.findByText(/could not load race results/i)).toBeInTheDocument();
  });
});
