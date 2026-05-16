import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn()", () => {
  it("returns an empty string with no arguments", () => {
    expect(cn()).toBe("");
  });

  it("returns a single class name unchanged", () => {
    expect(cn("flex")).toBe("flex");
  });

  it("joins multiple class names", () => {
    expect(cn("flex", "items-center")).toBe("flex items-center");
  });

  it("ignores falsy values (undefined, null, false)", () => {
    expect(cn("flex", undefined, null, false, "gap-2")).toBe("flex gap-2");
  });

  it("handles conditional expressions", () => {
    const isActive = true;
    expect(cn("base", isActive && "active")).toBe("base active");
    expect(cn("base", !isActive && "active")).toBe("base");
  });

  it("deduplicates conflicting Tailwind classes (last wins)", () => {
    expect(cn("p-4", "p-8")).toBe("p-8");
  });

  it("deduplicates conflicting text colour classes (last wins)", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles array inputs", () => {
    expect(cn(["flex", "items-center"])).toBe("flex items-center");
  });

  it("handles object inputs (clsx object syntax)", () => {
    expect(cn({ flex: true, hidden: false })).toBe("flex");
  });
});
