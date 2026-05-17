import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import CircuitThumb from "@/components/schedule/CircuitThumb";

vi.mock("next/image", () => ({
  default: ({ src, alt, width, height }: { src: string; alt: string; width: number; height: number }) => (
    <img src={src} alt={alt} width={width} height={height} />
  ),
}));

describe("<CircuitThumb />", () => {
  it("renders an image with the circuit alt text", () => {
    render(<CircuitThumb url="/logos/monaco.png" country="Monaco" />);
    expect(screen.getByRole("img", { name: /monaco circuit/i })).toBeInTheDocument();
  });

  it("renders nothing visible when image errors", async () => {
    const { container } = render(<CircuitThumb url="/bad.png" country="Nowhere" size={40} />);
    const img = container.querySelector("img");
    // Simulate error — component swaps to blank div
    if (img) {
      img.dispatchEvent(new Event("error"));
    }
    // After error, img should be removed
    expect(container.querySelector(".circuit-thumb")).toBeNull();
  });
});
