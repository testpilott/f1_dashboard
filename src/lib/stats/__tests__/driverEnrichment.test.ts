import { describe, expect, it } from "vitest";
import { resolveBirthplace, resolvePhotoUrl } from "@/lib/stats/driverEnrichment";

describe("resolveBirthplace", () => {
  it("returns Wikidata city + url when available", () => {
    expect(
      resolveBirthplace(
        {
          qid: "Q123",
          birthplaceCity: "Stevenage",
          birthplaceWikipediaUrl: "https://en.wikipedia.org/wiki/Stevenage",
          photoUrl: null,
        },
        "Stevenage, England",
      ),
    ).toEqual({
      city: "Stevenage",
      wikiUrl: "https://en.wikipedia.org/wiki/Stevenage",
    });
  });

  it("returns Wikidata city with null URL when URL absent", () => {
    expect(
      resolveBirthplace(
        {
          qid: "Q123",
          birthplaceCity: "Stevenage",
          birthplaceWikipediaUrl: null,
          photoUrl: null,
        },
        "Stevenage, England",
      ),
    ).toEqual({ city: "Stevenage", wikiUrl: null });
  });

  it("falls back to static hometown city", () => {
    expect(resolveBirthplace(null, "Stevenage, England")).toEqual({
      city: "Stevenage",
      wikiUrl: null,
    });
  });

  it("returns nulls when no data exists", () => {
    expect(resolveBirthplace(null, null)).toEqual({ city: null, wikiUrl: null });
  });
});

describe("resolvePhotoUrl", () => {
  it("returns url when present", () => {
    expect(
      resolvePhotoUrl({
        qid: "Q123",
        birthplaceCity: null,
        birthplaceWikipediaUrl: null,
        photoUrl: "https://example.com/photo.jpg",
      }),
    ).toBe("https://example.com/photo.jpg");
  });

  it("returns null when absent", () => {
    expect(resolvePhotoUrl(null)).toBeNull();
  });
});
