import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";
import DriversPage from "@/app/drivers/page";

vi.mock("next/image", () => ({
  default: ({ src, alt, width, height, className }: { src: string; alt: string; width: number; height: number; className?: string }) => (
    <img src={src} alt={alt} width={width} height={height} className={className} />
  ),
}));

function withQuery(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

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

function mockFetch(options?: { standingsFails?: boolean; photos?: unknown }) {
  global.fetch = vi.fn(async (url: unknown) => {
    const u = String(url);

    if (u.includes("/api/standings")) {
      if (options?.standingsFails) {
        throw new Error("Network error");
      }
      return new Response(JSON.stringify({ drivers: mockDrivers }), { status: 200 });
    }

    if (u.includes("/api/driver-photos")) {
      return new Response(JSON.stringify({ photos: options?.photos ?? mockPhotos }), { status: 200 });
    }

    return new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  mockFetch();
});

describe("<DriversPage />", () => {
  it("renders the page heading", () => {
    render(withQuery(<DriversPage />));
    expect(screen.getByText(/2026 Drivers/i)).toBeInTheDocument();
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
});
