import { describe, it, expect } from "vitest";
import { getFlagByDemonym, getCountryByDemonym } from "../nationality";

describe("getFlagByDemonym", () => {
  it("returns 🇬🇧 for British", () => {
    expect(getFlagByDemonym("British")).toBe("🇬🇧");
  });

  it("returns 🇳🇱 for Dutch", () => {
    expect(getFlagByDemonym("Dutch")).toBe("🇳🇱");
  });

  it("returns 🇲🇨 for Monegasque", () => {
    expect(getFlagByDemonym("Monegasque")).toBe("🇲🇨");
  });

  it("returns 🏁 for unknown demonym", () => {
    expect(getFlagByDemonym("Martian")).toBe("🏁");
  });

  it("returns 🏁 for empty string", () => {
    expect(getFlagByDemonym("")).toBe("🏁");
  });
});

describe("getCountryByDemonym", () => {
  it("returns United Kingdom for British", () => {
    expect(getCountryByDemonym("British")).toBe("United Kingdom");
  });

  it("returns Netherlands for Dutch", () => {
    expect(getCountryByDemonym("Dutch")).toBe("Netherlands");
  });

  it("returns the demonym unchanged for unknown input", () => {
    expect(getCountryByDemonym("Martian")).toBe("Martian");
  });
});
