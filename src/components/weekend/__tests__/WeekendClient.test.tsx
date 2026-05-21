import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import WeekendClient from "@/components/weekend/WeekendClient";
import type { OpenF1Session } from "@/lib/types";
import { withQuery } from "@/test/render";

const mockSession: OpenF1Session = {
  session_key: 1001,
  meeting_key: 5001,
  session_name: "Race",
  session_type: "Race",
  country_name: "Monaco",
  circuit_short_name: "Monaco",
  year: 2026,
  date_start: "2026-05-24T13:00:00",
  date_end: "2026-05-24T15:00:00",
};

const emptyData = { sessions: [], resultsBySession: {}, driversBySession: {} };
const mockData = {
  sessions: [mockSession],
  resultsBySession: { 1001: [] },
  driversBySession: { 1001: [] },
};

beforeEach(() => {
  global.fetch = vi.fn(async () =>
    new Response(JSON.stringify({ sessions: [mockSession], results: [], drivers: [] }), {
      status: 200,
    })
  ) as unknown as typeof fetch;
});

describe("<WeekendClient />", () => {
  it("renders the meeting name from session data", async () => {
    render(withQuery(<WeekendClient initialData={mockData} allMeetings={[]} />));
    expect(await screen.findByText("Monaco")).toBeInTheDocument();
  });

  it("renders Race tab when sessions exist", async () => {
    render(withQuery(<WeekendClient initialData={mockData} allMeetings={[]} />));
    expect(await screen.findByRole("tab", { name: /race/i })).toBeInTheDocument();
  });

  it("shows empty state when no sessions provided", async () => {
    render(withQuery(<WeekendClient initialData={emptyData} allMeetings={[]} />));
    expect(await screen.findByText(/no session data available/i)).toBeInTheDocument();
  });
});
