import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import DriversPage from "@/app/drivers/page";
import { withQuery } from "@/test/render";
import { createFetchRouter } from "@/test/fetch";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/drivers",
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, width, height, className }: { src: string; alt: string; width: number; height: number; className?: string }) => (
    <img src={src} alt={alt} width={width} height={height} className={className} />
  ),
}));

const mockDrivers = [
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
];

const mockPhotos = [
  {
    driver_number: 1,
    name_acronym: "VER",
    last_name: "Verstappen",
    headshot_url: "https://example.com/verstappen.png",
  },
];

const mockSeason = {
  season: "2026",
  driverId: "verstappen",
  summary: {
    driverId: "verstappen",
    season: "2026",
    rows: [
      {
        round: 1,
        raceName: "Bahrain Grand Prix",
        grid: 1,
        finish: 1,
        points: 25,
        status: "Finished",
        fastestLap: true,
      },
    ],
    aggregates: {
      races: 1,
      wins: 1,
      podiums: 1,
      points: 25,
      dnfs: 0,
      fastestLaps: 1,
      avgFinish: 1,
      avgGrid: 1,
    },
  },
};

const mockCareer = {
  driverId: "verstappen",
  career: { wins: 60, podiums: 98, starts: 210, fastestLaps: 44, championships: 4 },
};

function mockFetch(options?: { standingsFails?: boolean; photos?: unknown }) {
  if (options?.standingsFails) {
    global.fetch = vi.fn(async (url: unknown) => {
      const u = String(url);
      if (u.includes("/api/standings")) {
        throw new Error("Network error");
      }
      if (u.includes("/api/driver-photos")) {
        return new Response(JSON.stringify({ photos: options?.photos ?? mockPhotos }), {
          status: 200,
        });
      }
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;
    return;
  }

  global.fetch = createFetchRouter({
    "/api/standings": { drivers: mockDrivers },
    "/api/driver-photos": { photos: options?.photos ?? mockPhotos },
    "/api/driver-season": mockSeason,
    "/api/driver-career": mockCareer,
    "/api/news": { items: [] },
  });
}

beforeEach(() => {
  mockFetch();
});

describe("<DriversPage />", () => {
  it("renders the page heading", () => {
    render(withQuery(<DriversPage />));
    expect(screen.getByText(/2026.*Drivers/i)).toBeInTheDocument();
  });

  it("shows a driver card after loading", async () => {
    render(withQuery(<DriversPage />));
    expect(await screen.findByText(/Verstappen/i)).toBeInTheDocument();
  });

  it("renders a larger driver portrait when headshot is available", async () => {
    render(withQuery(<DriversPage />));
    const portrait = await screen.findByRole("img", { name: /max verstappen/i });
    expect(portrait).toHaveAttribute("width", "44");
    expect(portrait).toHaveAttribute("height", "44");
  });

  it("renders team-logo fallback at portrait size when no headshot is available", async () => {
    mockFetch({ photos: [] });
    render(withQuery(<DriversPage />));

    await screen.findByText(/Verstappen/i);
    const teamBadge = screen.getByTitle("Red Bull Racing");
    expect(teamBadge).toHaveStyle({ width: "44px", height: "44px" });
  });

  it("shows error state when fetch fails", async () => {
    mockFetch({ standingsFails: true });
    render(withQuery(<DriversPage />));
    expect(await screen.findByText(/failed to load drivers/i)).toBeInTheDocument();
  });

  it("selecting a driver opens detail panel with season and career blocks", async () => {
    const user = userEvent.setup();
    render(withQuery(<DriversPage />));

    const card = await screen.findByRole("button", { name: /verstappen/i });
    await user.click(card);

    expect((await screen.findAllByText("This Season")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Career").length).toBeGreaterThan(0);
  });
});
