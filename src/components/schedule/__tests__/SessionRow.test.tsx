import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SessionRow from "@/components/schedule/SessionRow";

describe("<SessionRow />", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows countdown and user time when user timezone differs", () => {
    render(
      <SessionRow
        session={{ label: "Qualifying", date: "2026-01-02", time: "10:00:00Z" }}
        circuitTz="UTC"
        userTz="America/New_York"
      />,
    );

    expect(screen.getByText("Circuit")).toBeInTheDocument();
    expect(screen.getByText("Your time")).toBeInTheDocument();
    expect(screen.getByText("In")).toBeInTheDocument();
  });

  it("hides countdown for sessions in the past", () => {
    render(
      <SessionRow
        session={{ label: "Race", date: "2025-12-30", time: "10:00:00Z" }}
        circuitTz="UTC"
        userTz="UTC"
      />,
    );

    expect(screen.queryByText("In")).not.toBeInTheDocument();
    expect(screen.queryByText("Your time")).not.toBeInTheDocument();
  });
});
