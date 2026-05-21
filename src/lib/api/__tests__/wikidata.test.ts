import { describe, expect, it } from "vitest";
import {
  parseWikipediaTitle,
  extractQid,
  extractBirthplaceQid,
  extractPhotoFilename,
  extractPlaceLabelAndWiki,
  commonsThumbUrl,
} from "@/lib/api/wikidata";

describe("parseWikipediaTitle", () => {
  it("extracts title from a standard Wikipedia URL", () => {
    expect(parseWikipediaTitle("https://en.wikipedia.org/wiki/Lewis_Hamilton")).toBe("Lewis_Hamilton");
  });

  it("decodes percent-encoded titles", () => {
    expect(parseWikipediaTitle("https://en.wikipedia.org/wiki/Max_Verstappen")).toBe("Max_Verstappen");
  });

  it("returns null for non-Wikipedia URLs", () => {
    expect(parseWikipediaTitle("https://example.com/wiki/Lewis_Hamilton")).toBeNull();
  });

  it("returns null for malformed URLs", () => {
    expect(parseWikipediaTitle("not-a-url")).toBeNull();
  });

  it("returns null when path has no /wiki/ segment", () => {
    expect(parseWikipediaTitle("https://en.wikipedia.org/Lewis_Hamilton")).toBeNull();
  });
});

describe("extractQid", () => {
  it("returns QID string from a valid search result entry", () => {
    expect(extractQid({ id: "Q9673", label: "Lewis Hamilton" })).toBe("Q9673");
  });

  it("returns null when id is not a QID", () => {
    expect(extractQid({ id: "NotAQid" })).toBeNull();
  });

  it("returns null for null input", () => {
    expect(extractQid(null)).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(extractQid("Q123")).toBeNull();
  });
});

describe("extractBirthplaceQid", () => {
  const claims = {
    P19: [
      {
        mainsnak: {
          datavalue: {
            value: { id: "Q179695" },
          },
        },
      },
    ],
  };

  it("extracts the birthplace QID from claims", () => {
    expect(extractBirthplaceQid(claims)).toBe("Q179695");
  });

  it("returns null when P19 is missing", () => {
    expect(extractBirthplaceQid({})).toBeNull();
  });

  it("returns null for null input", () => {
    expect(extractBirthplaceQid(null)).toBeNull();
  });

  it("returns null when value.id is not a QID", () => {
    const bad = { P19: [{ mainsnak: { datavalue: { value: { id: "not-a-qid" } } } }] };
    expect(extractBirthplaceQid(bad)).toBeNull();
  });
});

describe("extractPhotoFilename", () => {
  const claims = {
    P18: [
      {
        mainsnak: {
          datavalue: { value: "Lewis Hamilton 2016 Malaysia 2.jpg" },
        },
      },
    ],
  };

  it("extracts the photo filename from claims", () => {
    expect(extractPhotoFilename(claims)).toBe("Lewis Hamilton 2016 Malaysia 2.jpg");
  });

  it("returns null when P18 is missing", () => {
    expect(extractPhotoFilename({})).toBeNull();
  });

  it("returns null for null input", () => {
    expect(extractPhotoFilename(null)).toBeNull();
  });
});

describe("extractPlaceLabelAndWiki", () => {
  const entity = {
    labels: { en: { value: "Stevenage" } },
    sitelinks: { enwiki: { title: "Stevenage" } },
  };

  it("extracts label and Wikipedia URL", () => {
    const result = extractPlaceLabelAndWiki(entity);
    expect(result.label).toBe("Stevenage");
    expect(result.wikiUrl).toBe("https://en.wikipedia.org/wiki/Stevenage");
  });

  it("returns null label when labels.en missing", () => {
    const result = extractPlaceLabelAndWiki({ sitelinks: { enwiki: { title: "Stevenage" } } });
    expect(result.label).toBeNull();
    expect(result.wikiUrl).toBe("https://en.wikipedia.org/wiki/Stevenage");
  });

  it("returns null wikiUrl when sitelinks.enwiki missing", () => {
    const result = extractPlaceLabelAndWiki({ labels: { en: { value: "Stevenage" } }, sitelinks: {} });
    expect(result.label).toBe("Stevenage");
    expect(result.wikiUrl).toBeNull();
  });

  it("returns nulls for null input", () => {
    expect(extractPlaceLabelAndWiki(null)).toEqual({ label: null, wikiUrl: null });
  });
});

describe("commonsThumbUrl", () => {
  it("builds a Commons thumbnail URL with default width", () => {
    const url = commonsThumbUrl("Lewis_Hamilton.jpg");
    expect(url).toBe(
      "https://commons.wikimedia.org/wiki/Special:FilePath/Lewis_Hamilton.jpg?width=320"
    );
  });

  it("replaces spaces with underscores", () => {
    const url = commonsThumbUrl("Lewis Hamilton 2016.jpg");
    expect(url).toContain("Lewis_Hamilton_2016.jpg");
  });

  it("respects custom width", () => {
    const url = commonsThumbUrl("Driver.jpg", 640);
    expect(url).toContain("width=640");
  });
});
