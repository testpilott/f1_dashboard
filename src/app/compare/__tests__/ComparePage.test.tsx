import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import ComparePage from "@/app/compare/page";
import { withQuery } from "@/test/render";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
  ok: false,
  json: () => Promise.resolve({}),
}));
});

describe("ComparePage", () => {
  it("renders heading", () => {
    render(withQuery(<ComparePage />));
    expect(screen.getByText("Head-to-Head")).toBeInTheDocument();
  });

  it("shows select-two-drivers prompt when no drivers selected", async () => {
    render(withQuery(<ComparePage />));
    expect(await screen.findByText(/select two drivers above/i)).toBeInTheDocument();
  });

  it("renders Driver A and Driver B labels after load", async () => {
    render(withQuery(<ComparePage />));
    // Labels are exact "Driver A" / "Driver B" — distinct from the placeholder text
    expect(await screen.findByText("Driver A")).toBeInTheDocument();
    expect(screen.getByText("Driver B")).toBeInTheDocument();
  });
});
