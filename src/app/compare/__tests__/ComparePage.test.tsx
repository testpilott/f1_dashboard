import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ComparePage from "@/app/compare/page";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
  ok: false,
  json: () => Promise.resolve({}),
}));
});

describe("ComparePage", () => {
  it("renders heading", () => {
    render(<ComparePage />, { wrapper });
    expect(screen.getByText("Head-to-Head")).toBeInTheDocument();
  });

  it("shows select-two-drivers prompt when no drivers selected", async () => {
    render(<ComparePage />, { wrapper });
    expect(await screen.findByText(/select two drivers above/i)).toBeInTheDocument();
  });

  it("renders Driver A and Driver B labels after load", async () => {
    render(<ComparePage />, { wrapper });
    // Labels are exact "Driver A" / "Driver B" — distinct from the placeholder text
    expect(await screen.findByText("Driver A")).toBeInTheDocument();
    expect(screen.getByText("Driver B")).toBeInTheDocument();
  });
});
