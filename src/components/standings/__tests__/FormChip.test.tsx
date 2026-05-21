import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FormChip from "@/components/standings/FormChip";

describe("<FormChip />", () => {
  it("renders up trend icon state with average points", () => {
    render(
      <FormChip
        form={{ races: 5, avgPoints: 18.4, podiumRatio: 0.4, finishes: 5, trend: "up" }}
      />,
    );

    expect(screen.getByText("18.4")).toBeInTheDocument();
    expect(screen.getByTitle(/trend up/i)).toBeInTheDocument();
  });

  it("renders placeholder when form is missing", () => {
    render(<FormChip form={undefined} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});