import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import ScheduleClient from "@/components/schedule/ScheduleClient";
import type { Race } from "@/lib/types";

function mkRace(p: Partial<Race> & { round: string; raceName: string; date: string }): Race {
  return {
    season: "2026",
    Circuit: {
      circuitId: "monza",
      circuitName: "Autodromo Nazionale Monza",
      Location: { locality: "Monza", country: "Italy", lat: "0", long: "0" },
    },
    ...p,
  } as unknown as Race;
}

const future = mkRace({
  round: "20",
  raceName: "Future Grand Prix",
  date: "2099-09-06",
  time: "13:00:00Z",
  Qualifying: { date: "2099-09-05", time: "14:00:00Z" },
  Sprint: { date: "2099-09-05", time: "10:00:00Z" },
});

const past = mkRace({ round: "1", raceName: "Past Grand Prix", date: "2000-03-15" });

describe("<ScheduleClient />", () => {
  it("lists every race and links the season iCal export", () => {
    render(<ScheduleClient races={[past, future]} />);
    expect(screen.getByText("Past Grand Prix")).toBeInTheDocument();
    expect(screen.getByText("Future Grand Prix")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /add season to calendar/i });
    expect(link).toHaveAttribute("href", "/api/schedule/export?season=2026");
    expect(link).toHaveAttribute("download", "f1-2026.ics");
  });

  it("marks a past race as Done and a sprint weekend with a Sprint badge", () => {
    render(<ScheduleClient races={[past, future]} />);
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByText("Sprint")).toBeInTheDocument();
  });

  it("expands a row to reveal its session breakdown", async () => {
    render(<ScheduleClient races={[future]} />);
    const header = screen.getByRole("button", { expanded: false });
    await userEvent.click(header);

    expect(screen.getByRole("button", { expanded: true })).toBeInTheDocument();
    expect(screen.getByText("Qualifying")).toBeInTheDocument();
    expect(screen.getByText("Sprint Race")).toBeInTheDocument();
    expect(screen.getByText("Race")).toBeInTheDocument();
    // Future sessions show an "In" countdown row.
    expect(screen.getAllByText("In").length).toBeGreaterThan(0);
  });

  it("falls back to 'current' season when races have no season field", () => {
    const r = mkRace({ round: "1", raceName: "X GP", date: "2026-01-01" });
    delete (r as Partial<Race>).season;
    render(<ScheduleClient races={[r]} />);
    expect(screen.getByRole("link", { name: /add season to calendar/i })).toHaveAttribute(
      "href",
      "/api/schedule/export?season=current",
    );
  });

  it("renders nothing but the export bar for an empty (defensive) list", () => {
    render(<ScheduleClient races={[]} />);
    expect(screen.getByRole("link", { name: /add season to calendar/i })).toHaveAttribute(
      "href",
      "/api/schedule/export?season=current",
    );
  });

  it("shows Past Races and Upcoming Races sections with a divider when both exist", () => {
    render(<ScheduleClient races={[past, future]} />);
    expect(screen.getByRole("region", { name: /past races/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /upcoming races/i })).toBeInTheDocument();
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("shows only Upcoming Races label when there are no past races", () => {
    render(<ScheduleClient races={[future]} />);
    expect(screen.getByText("Upcoming Races")).toBeInTheDocument();
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
  });

  it("shows only Past Races section when all races are past", () => {
    render(<ScheduleClient races={[past]} />);
    expect(screen.getByRole("region", { name: /past races/i })).toBeInTheDocument();
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
  });
});
