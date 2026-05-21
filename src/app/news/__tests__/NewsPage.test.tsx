import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import NewsPage from "@/app/news/page";
import { withQuery } from "@/test/render";

const mockNewsResponse = {
  items: [
    {
      title: "Verstappen takes pole in Monaco",
      link: "https://example.com/article",
      source: "Autosport",
      pubDate: "2026-05-17T10:00:00Z",
      contentSnippet: "A great qualifying lap.",
    },
  ],
};

beforeEach(() => {
  global.fetch = vi.fn(async () =>
    new Response(JSON.stringify(mockNewsResponse), { status: 200 })
  ) as unknown as typeof fetch;
});

describe("<NewsPage />", () => {
  it("renders the page heading", () => {
    render(withQuery(<NewsPage />));
    expect(screen.getByText("F1 News")).toBeInTheDocument();
  });

  it("shows a news article title after loading", async () => {
    render(withQuery(<NewsPage />));
    expect(await screen.findByText("Verstappen takes pole in Monaco")).toBeInTheDocument();
  });

  it("shows empty state when API returns no items", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ items: [] }), { status: 200 })
    );
    render(withQuery(<NewsPage />));
    expect(await screen.findByText(/no articles found/i)).toBeInTheDocument();
  });
});
