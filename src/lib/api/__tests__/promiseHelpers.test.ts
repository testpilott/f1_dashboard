import { describe, expect, it } from "vitest";
import { extractFulfilled, extractAllFulfilled } from "@/lib/api/promiseHelpers";

describe("extractFulfilled", () => {
  it("returns the value for fulfilled results", () => {
    const result: PromiseSettledResult<number> = { status: "fulfilled", value: 42 };
    expect(extractFulfilled(result, 0)).toBe(42);
  });

  it("returns the fallback for rejected results", () => {
    const result: PromiseSettledResult<number> = {
      status: "rejected",
      reason: new Error("boom"),
    };
    expect(extractFulfilled(result, 0)).toBe(0);
  });

  it("supports null fallback for nullable types", () => {
    const result: PromiseSettledResult<string | null> = {
      status: "rejected",
      reason: new Error("nope"),
    };
    expect(extractFulfilled<string | null>(result, null)).toBeNull();
  });

  it("returns the fulfilled value even when it is falsy", () => {
    const result: PromiseSettledResult<number> = { status: "fulfilled", value: 0 };
    expect(extractFulfilled(result, 999)).toBe(0);
  });
});

describe("extractAllFulfilled", () => {
  it("maps over mixed settled results", () => {
    const results: PromiseSettledResult<number>[] = [
      { status: "fulfilled", value: 1 },
      { status: "rejected", reason: new Error("x") },
      { status: "fulfilled", value: 3 },
    ];
    expect(extractAllFulfilled(results, -1)).toEqual([1, -1, 3]);
  });

  it("returns [] for empty input", () => {
    expect(extractAllFulfilled([], 0)).toEqual([]);
  });
});
