import { describe, expect, it } from "vitest";
import {
  isFavorite,
  parseFavorites,
  serialiseFavorites,
  sortFavoritesFirst,
  toggleFavorite,
} from "@/lib/favorites";

describe("parseFavorites", () => {
  it("returns [] for null", () => {
    expect(parseFavorites(null)).toEqual([]);
  });

  it("parses valid JSON array", () => {
    expect(parseFavorites('["hamilton"]')).toEqual(["hamilton"]);
  });

  it("returns [] for invalid JSON", () => {
    expect(parseFavorites("not json")).toEqual([]);
  });

  it("returns [] when parsed value is not an array", () => {
    expect(parseFavorites('{"key":"val"}')).toEqual([]);
  });
});

describe("favorites helpers", () => {
  it("serializes arrays", () => {
    expect(serialiseFavorites(["hamilton"])).toBe('["hamilton"]');
  });

  it("toggles on", () => {
    expect(toggleFavorite([], "hamilton")).toEqual(["hamilton"]);
  });

  it("toggles off", () => {
    expect(toggleFavorite(["hamilton"], "hamilton")).toEqual([]);
  });

  it("checks isFavorite", () => {
    expect(isFavorite(["hamilton"], "hamilton")).toBe(true);
    expect(isFavorite([], "hamilton")).toBe(false);
  });

  it("sorts favorites first and keeps relative order", () => {
    const items = [{ id: "hamilton" }, { id: "verstappen" }, { id: "alonso" }];
    const sorted = sortFavoritesFirst(items, (i) => i.id, ["verstappen"]);
    expect(sorted.map((i) => i.id)).toEqual(["verstappen", "hamilton", "alonso"]);
  });
});
