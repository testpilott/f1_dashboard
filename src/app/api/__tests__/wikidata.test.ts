import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
}));

vi.mock("@/lib/api/withRateLimit", () => ({
  rateLimited: vi.fn(() => null),
}));

vi.mock("@/lib/api/wikidata", () => ({
  getWikidataDriverProfile: vi.fn(),
  parseWikipediaTitle: vi.fn(),
}));

import { GET } from "@/app/api/wikidata/route";
import {
  getWikidataDriverProfile,
  parseWikipediaTitle,
} from "@/lib/api/wikidata";
import { makeApiRequest } from "@/test/api";

describe("GET /api/wikidata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when wikiUrl is missing", async () => {
    const res = await GET(makeApiRequest("/api/wikidata"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing required parameter/i);
  });

  it("returns 400 when wikiUrl is not a valid Wikipedia URL", async () => {
    vi.mocked(parseWikipediaTitle).mockReturnValue(null);
    const res = await GET(
      makeApiRequest("/api/wikidata", { wikiUrl: "https://example.com/foo" }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/english wikipedia/i);
  });

  it("returns 404 when no profile is found upstream", async () => {
    vi.mocked(parseWikipediaTitle).mockReturnValue("Lewis_Hamilton");
    vi.mocked(getWikidataDriverProfile).mockResolvedValue(null);
    const res = await GET(
      makeApiRequest("/api/wikidata", {
        wikiUrl: "https://en.wikipedia.org/wiki/Lewis_Hamilton",
      }),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/profile not found/i);
  });

  it("returns 200 with the profile when upstream resolves", async () => {
    vi.mocked(parseWikipediaTitle).mockReturnValue("Lewis_Hamilton");
    vi.mocked(getWikidataDriverProfile).mockResolvedValue({
      qid: "Q9673",
      birthplaceCity: "Stevenage",
      birthplaceWikipediaUrl: "https://en.wikipedia.org/wiki/Stevenage",
      photoUrl: "https://example.com/photo.jpg",
    });
    const res = await GET(
      makeApiRequest("/api/wikidata", {
        wikiUrl: "https://en.wikipedia.org/wiki/Lewis_Hamilton",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.qid).toBe("Q9673");
  });

  it("returns 500 when the profile fetch throws", async () => {
    vi.mocked(parseWikipediaTitle).mockReturnValue("Lewis_Hamilton");
    vi.mocked(getWikidataDriverProfile).mockRejectedValue(new Error("upstream"));
    const res = await GET(
      makeApiRequest("/api/wikidata", {
        wikiUrl: "https://en.wikipedia.org/wiki/Lewis_Hamilton",
      }),
    );
    expect(res.status).toBe(500);
  });
});
