import { describe, expect, it } from "vitest";
import { ensureArray } from "@/lib/utils";

describe("ensureArray", () => {
  it("returns the array when given one", () => {
    expect(ensureArray([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("returns an empty array for non-array inputs", () => {
    expect(ensureArray(null)).toEqual([]);
    expect(ensureArray(undefined)).toEqual([]);
    expect(ensureArray({})).toEqual([]);
    expect(ensureArray("foo")).toEqual([]);
    expect(ensureArray(42)).toEqual([]);
  });

  it("preserves empty arrays", () => {
    expect(ensureArray([])).toEqual([]);
  });

  it("preserves nested arrays without flattening", () => {
    expect(ensureArray([[1], [2]])).toEqual([[1], [2]]);
  });
});
