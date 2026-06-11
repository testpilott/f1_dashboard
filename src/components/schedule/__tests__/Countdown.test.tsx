import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Countdown from "@/components/schedule/Countdown";

describe("<Countdown />", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a formatted countdown for future targets", () => {
    render(<Countdown target={new Date("2026-01-01T00:01:01.000Z")} />);
    expect(screen.getByText("1m 1s")).toBeInTheDocument();
  });

  it("renders Starting… when the target time has passed", () => {
    render(<Countdown target={new Date("2025-12-31T23:59:59.000Z")} />);
    expect(screen.getByText("Starting…")).toBeInTheDocument();
  });
});
