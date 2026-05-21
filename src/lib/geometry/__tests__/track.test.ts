import { describe, expect, it } from "vitest";
import { getSectorId, rotatePoint, splitBySectors } from "@/lib/geometry/track";

describe("rotatePoint", () => {
  it("returns identity for 0 degree rotation", () => {
    const out = rotatePoint(13, 14, 10, 10, 0);
    expect(out.x).toBeCloseTo(13, 6);
    expect(out.y).toBeCloseTo(14, 6);
  });

  it("rotates 90 degrees around a known center", () => {
    const out = rotatePoint(11, 10, 10, 10, 90);
    expect(out.x).toBeCloseTo(10, 6);
    expect(out.y).toBeCloseTo(11, 6);
  });

  it("rotates 180 degrees around a known center", () => {
    const out = rotatePoint(12, 9, 10, 10, 180);
    expect(out.x).toBeCloseTo(8, 6);
    expect(out.y).toBeCloseTo(11, 6);
  });
});

describe("splitBySectors", () => {
  it("splits a short polyline into three expected segment strings", () => {
    const [s1, s2, s3] = splitBySectors(
      [0, 1, 2, 3, 4, 5],
      [0, 0, 0, 0, 0, 0],
      [0, 1, 2, 3, 4, 5],
    );

    expect(s1).toBe("0,0 1,0 2,0");
    expect(s2).toBe("2,0 3,0 4,0");
    expect(s3).toBe("4,0 5,0");
  });
});

describe("getSectorId", () => {
  it("classifies corners at sector boundaries", () => {
    expect(getSectorId({ length: 0 }, 300)).toBe(1);
    expect(getSectorId({ length: 100 }, 300)).toBe(2);
    expect(getSectorId({ length: 200 }, 300)).toBe(3);
  });
});