import { describe, it, expect } from "vitest";
import { search } from "@/lib/search";
import type { SearchIndex } from "@/lib/search";

const index: SearchIndex = {
  drivers: [
    { kind: "driver", id: "hamilton", label: "Lewis Hamilton", sublabel: "Mercedes", href: "/drivers" },
    { kind: "driver", id: "verstappen", label: "Max Verstappen", sublabel: "Red Bull", href: "/drivers" },
    { kind: "driver", id: "leclerc", label: "Charles Leclerc", sublabel: "Ferrari", href: "/drivers" },
  ],
  constructors: [
    { kind: "constructor", id: "ferrari", label: "Ferrari", href: "/compare" },
    { kind: "constructor", id: "mercedes", label: "Mercedes", href: "/compare" },
  ],
  circuits: [
    { kind: "circuit", id: "monaco", label: "Circuit de Monaco", sublabel: "Monaco", href: "/schedule" },
  ],
  races: [
    { kind: "race", id: "2026-1", label: "Bahrain Grand Prix", sublabel: "2026", href: "/race/2026/1" },
  ],
};

describe("search", () => {
  it("returns empty array for blank query", () => {
    expect(search(index, "")).toHaveLength(0);
    expect(search(index, "  ")).toHaveLength(0);
  });

  it("finds a driver by surname", () => {
    const results = search(index, "hamilton");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("hamilton");
  });

  it("finds by team name via sublabel", () => {
    const results = search(index, "ferrari");
    const ids = results.map((r) => r.id);
    expect(ids).toContain("ferrari");
    expect(ids).toContain("leclerc");
  });

  it("is case-insensitive", () => {
    expect(search(index, "HAMILTON")).toHaveLength(1);
    expect(search(index, "Hamilton")).toHaveLength(1);
  });

  it("prefix matches score higher and appear first", () => {
    const results = search(index, "max");
    expect(results[0].id).toBe("verstappen");
  });

  it("respects the limit parameter", () => {
    const results = search(index, "a", 2);
    expect(results).toHaveLength(2);
  });

  it("returns all matching kinds in one result set", () => {
    // "monaco" should match the circuit
    const results = search(index, "monaco");
    expect(results.some((r) => r.kind === "circuit")).toBe(true);
  });

  it("partial match works", () => {
    expect(search(index, "ver")).toHaveLength(1);
    expect(search(index, "ver")[0].id).toBe("verstappen");
  });
});
