import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/schedule",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: React.ComponentProps<"img">) => (
    <img src={src} alt={alt} {...props} />
  ),
}));
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark", setTheme: vi.fn() }),
}));

import Navbar from "@/components/layout/Navbar";

describe("Navbar", () => {
  it("renders all 6 destinations", () => {
    render(<Navbar />);
    for (const label of ["Standings", "Schedule", "Drivers", "Compare", "Projections", "News"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("marks the active route with aria-current", () => {
    render(<Navbar />);
    const activeLinks = screen.getAllByRole("link").filter(
      (a) => a.getAttribute("aria-current") === "page"
    );
    expect(activeLinks.length).toBeGreaterThan(0);
    // At least one active link should be for /schedule
    expect(activeLinks.some((a) => a.getAttribute("href") === "/schedule")).toBe(true);
  });

  it("logo links to the home page", () => {
    render(<Navbar />);
    const homeLinks = screen.getAllByRole("link").filter(
      (a) => a.getAttribute("href") === "/"
    );
    expect(homeLinks.length).toBeGreaterThan(0);
  });
});
