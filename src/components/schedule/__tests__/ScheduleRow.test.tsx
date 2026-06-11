import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import ScheduleRow from "@/components/schedule/ScheduleRow";
import { makeRace } from "@/test/fixtures";

describe("<ScheduleRow />", () => {
  it("expands to show sessions and the race detail link", async () => {
    const race = makeRace({
      round: "5",
      raceName: "Monaco Grand Prix",
      date: "2099-05-25",
      time: "13:00:00Z",
      Qualifying: { date: "2099-05-24", time: "14:00:00Z" },
    });

    render(<ScheduleRow race={race} />);
    await userEvent.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByText("Qualifying")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /race detail/i })).toHaveAttribute(
      "href",
      "/race/2026/5",
    );
  });

  it("shows a Done badge and View results link for past races", async () => {
    const race = makeRace({ round: "1", raceName: "Past GP", date: "2000-03-15" });

    render(<ScheduleRow race={race} />);
    await userEvent.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view results/i })).toBeInTheDocument();
  });
});
