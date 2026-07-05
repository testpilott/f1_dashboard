import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SprintWinsChip from "@/components/ui/SprintWinsChip";

describe("SprintWinsChip", () => {
  it("renders the count with an S marker", () => {
    render(<SprintWinsChip count={2} />);
    const chip = screen.getByText("2S");
    expect(chip).toBeInTheDocument();
  });

  it("carries an accessible label naming the sprint-win count", () => {
    render(<SprintWinsChip count={1} />);
    expect(screen.getByLabelText("1 sprint win")).toBeInTheDocument();
  });

  it("pluralises the accessible label", () => {
    render(<SprintWinsChip count={3} />);
    expect(screen.getByLabelText("3 sprint wins")).toBeInTheDocument();
  });

  it("renders nothing for zero wins", () => {
    const { container } = render(<SprintWinsChip count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the count is undefined (tallies unavailable)", () => {
    const { container } = render(<SprintWinsChip count={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
