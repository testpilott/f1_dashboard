import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DriverNewsSection from "@/components/drivers/sections/DriverNewsSection";

describe("<DriverNewsSection />", () => {
  it("renders news links when items exist", () => {
    render(
      <DriverNewsSection
        newsLoading={false}
        news={[{ title: "Driver wins again", link: "https://example.com/news", pubDate: "2026-01-01T00:00:00Z" }]}
      />,
    );

    expect(screen.getByText("Latest News")).toBeInTheDocument();
    expect(screen.getByText("Driver wins again")).toBeInTheDocument();
  });

  it("renders empty state when there are no news items", () => {
    render(<DriverNewsSection newsLoading={false} news={[]} />);
    expect(screen.getByText("No recent news found.")).toBeInTheDocument();
  });
});
