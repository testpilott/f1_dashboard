import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ScheduleRow from "@/components/schedule/ScheduleRow";
import { withQuery } from "@/test/render";
import { makeRace, makeRaceResult, makeDriver, makeConstructor } from "@/test/fixtures";

beforeEach(() => {
  global.fetch = vi.fn(async () =>
    new Response(
      JSON.stringify({
        results: [
          makeRaceResult({
            position: "1",
            positionText: "1",
            points: "25",
            Time: { millis: "5400000", time: "1:30:00.000" },
            Driver: makeDriver({ driverId: "verstappen", code: "VER", givenName: "Max", familyName: "Verstappen" }),
            Constructor: makeConstructor({ name: "Red Bull Racing" }),
          }),
        ],
      }),
      { status: 200 },
    ),
  ) as unknown as typeof fetch;
});

describe("<ScheduleRow />", () => {
  it("expands an upcoming race to show session timings and the race detail link", async () => {
    const race = makeRace({
      round: "5",
      raceName: "Monaco Grand Prix",
      date: "2099-05-25",
      time: "13:00:00Z",
      Qualifying: { date: "2099-05-24", time: "14:00:00Z" },
    });

    render(withQuery(<ScheduleRow race={race} />));
    await userEvent.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByText("Qualifying")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /race detail/i })).toHaveAttribute(
      "href",
      "/race/2026/5",
    );
    // No results fetch for upcoming races.
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("replaces session timings with the race classification for a finished race", async () => {
    const race = makeRace({
      round: "1",
      raceName: "Past GP",
      date: "2000-03-15",
      time: "13:00:00Z",
      Qualifying: { date: "2000-03-14", time: "14:00:00Z" },
    });

    render(withQuery(<ScheduleRow race={race} />));
    await userEvent.click(screen.getByRole("button", { expanded: false }));

    // Classification appears…
    expect(await screen.findByText("Max Verstappen")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
    // …and the session-timings list is gone.
    expect(screen.queryByText("Qualifying")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /full race detail/i }),
    ).toHaveAttribute("href", "/race/2026/1");
  });

  it("shows a Done badge for past races", async () => {
    const race = makeRace({ round: "1", raceName: "Past GP", date: "2000-03-15" });

    render(withQuery(<ScheduleRow race={race} />));

    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("still shows timings on race-day morning before the race has finished", async () => {
    // Race starts in ~1 hour: date is "today" from the component's
    // perspective only if we freeze time — so freeze it.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-05-24T10:00:00Z"));

    const race = makeRace({
      round: "8",
      raceName: "Race Day GP",
      date: "2026-05-24",
      time: "13:00:00Z",
    });

    render(withQuery(<ScheduleRow race={race} />));
    await userEvent.click(screen.getByRole("button", { expanded: false }));

    // Session list (the Race entry) renders; no classification fetch fires.
    expect(screen.getByText("Race")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
