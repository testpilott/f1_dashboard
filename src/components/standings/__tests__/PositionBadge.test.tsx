import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MedalPositionBadge from "@/components/standings/MedalPositionBadge";

describe("<MedalPositionBadge />", () => {
  it("renders medal styling for podium positions", () => {
    const { container } = render(<MedalPositionBadge pos={1} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(container.querySelector(".bg-medal-gold")).toBeInTheDocument();
  });

  it("renders plain text styling for non-podium positions", () => {
    const { container } = render(<MedalPositionBadge pos={7} />);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(container.querySelector(".bg-medal-gold")).not.toBeInTheDocument();
  });
});