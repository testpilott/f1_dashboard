import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

describe("Card", () => {
  it("renders children", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test</CardTitle>
        </CardHeader>
        <CardContent>content</CardContent>
      </Card>
    );
    expect(screen.getByText("Test")).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("applies panel variant data attribute", () => {
    render(<Card variant="panel" data-testid="panel-card">body</Card>);
    const card = screen.getByTestId("panel-card");
    expect(card.getAttribute("data-variant")).toBe("panel");
  });
});

describe("Button", () => {
  it("renders label", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("is disabled when disabled prop is set", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button", { name: "Disabled" })).toBeDisabled();
  });
});
