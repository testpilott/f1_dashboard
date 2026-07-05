import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import StandingsTables from "@/components/standings/StandingsTables";
import { withQuery } from "@/test/render";
import { createFetchRouter } from "@/test/fetch";

const mockData = {
  drivers: [
    {
      position: "1",
      positionText: "1",
      points: "100",
      wins: "3",
      Driver: {
        driverId: "verstappen",
        permanentNumber: "1",
        code: "VER",
        url: "",
        givenName: "Max",
        familyName: "Verstappen",
        dateOfBirth: "1997-09-30",
        nationality: "Dutch",
      },
      Constructors: [
        { constructorId: "red_bull", url: "", name: "Red Bull Racing", nationality: "Austrian" },
      ],
    },
  ],
  constructors: [
    {
      position: "1",
      positionText: "1",
      points: "200",
      wins: "5",
      Constructor: {
        constructorId: "red_bull",
        url: "",
        name: "Red Bull Racing",
        nationality: "Austrian",
      },
    },
  ],
};

const formPayload = {
  form: {
    verstappen: { races: 5, avgPoints: 22.4, podiumRatio: 0.8, finishes: 5, trend: "up" },
  },
};

/** Route the fetch mock by URL so the two independent queries stay isolated. */
function mockFetch(formResponse: unknown = formPayload, standings: unknown = mockData) {
  global.fetch = createFetchRouter({
    "/api/form": formResponse,
    "/api/standings": standings,
  });
}

beforeEach(() => {
  mockFetch();
});

describe("<StandingsTables />", () => {
  it("renders driver name and points on the happy path", async () => {
    render(withQuery(<StandingsTables initialData={mockData} />));
    expect(await screen.findByText(/verstappen/i)).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("renders the leader's position badge with the gold medal token", () => {
    render(withQuery(<StandingsTables initialData={mockData} />));
    const goldBadge = screen
      .getAllByText("1")
      .find((el) => el.className.includes("bg-medal-gold"));
    expect(goldBadge).toBeInTheDocument();
    // No raw Tailwind color literals should remain on the badge.
    expect(goldBadge).not.toHaveClass("bg-yellow-400");
    expect(goldBadge).not.toHaveClass("bg-slate-400");
    expect(goldBadge).not.toHaveClass("bg-amber-400");
  });

  it("hydrates the driver form chip from /api/form", async () => {
    render(withQuery(<StandingsTables initialData={mockData} />));
    // 22.4 avg pts with an "up" trend
    expect(await screen.findByText("22.4")).toBeInTheDocument();
    const chip = screen.getByTitle(/trend up/i);
    expect(chip).toHaveTextContent("22.4");
  });

  it("shows a neutral placeholder when form data is unavailable", async () => {
    mockFetch({ form: {} });
    render(withQuery(<StandingsTables initialData={mockData} />));
    expect(await screen.findByText(/verstappen/i)).toBeInTheDocument();
    // Form column falls back to the em dash, table still renders.
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("switches to the Constructors tab and shows constructor rows", async () => {
    render(withQuery(<StandingsTables initialData={mockData} />));
    await userEvent.click(screen.getByRole("tab", { name: /constructors/i }));
    const constructorsPanel = screen.getByRole("tabpanel");
    expect(within(constructorsPanel).getByText("200")).toBeInTheDocument();
  });

  it("shows empty state when no drivers available", async () => {
    mockFetch(formPayload, { drivers: [], constructors: [] });
    render(withQuery(<StandingsTables initialData={{ drivers: [], constructors: [] }} />));
    expect(await screen.findByText(/no standings available/i)).toBeInTheDocument();
  });

  it("renders a sprint-wins chip beside race wins without changing the wins value", async () => {
    const withSprints = {
      ...mockData,
      sprintWins: { drivers: { verstappen: 2 }, constructors: { red_bull: 2 } },
    };
    mockFetch(formPayload, withSprints);
    render(withQuery(<StandingsTables initialData={withSprints} />));

    expect(await screen.findByText(/verstappen/i)).toBeInTheDocument();
    // Secondary chip present with accessible label…
    expect(screen.getByLabelText("2 sprint wins")).toHaveTextContent("2S");
    // …while the official race-win count stays the untouched standings value.
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows the sprint chip on the Constructors tab too", async () => {
    const withSprints = {
      ...mockData,
      sprintWins: { drivers: { verstappen: 2 }, constructors: { red_bull: 1 } },
    };
    mockFetch(formPayload, withSprints);
    render(withQuery(<StandingsTables initialData={withSprints} />));

    await userEvent.click(screen.getByRole("tab", { name: /constructors/i }));
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByLabelText("1 sprint win")).toHaveTextContent("1S");
    expect(within(panel).getByText("5")).toBeInTheDocument();
  });

  it("renders no sprint chip when tallies are absent (pre-sprint data or fetch failure)", async () => {
    render(withQuery(<StandingsTables initialData={mockData} />));
    expect(await screen.findByText(/verstappen/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/sprint win/i)).not.toBeInTheDocument();
  });
});
