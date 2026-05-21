import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/fetchWithTimeout", () => ({
  fetchWithTimeout: vi.fn(),
}));

import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";
import { createApiFetcher } from "@/lib/api/createApiFetcher";

describe("createApiFetcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns parsed json for ok responses", async () => {
    const response = new Response(JSON.stringify({ hello: "world" }), { status: 200 });
    vi.mocked(fetchWithTimeout).mockResolvedValueOnce(response);

    const apiFetch = createApiFetcher("https://example.test", "Example");
    const out = await apiFetch<{ hello: string }>("/endpoint", 300);

    expect(out).toEqual({ hello: "world" });
    expect(fetchWithTimeout).toHaveBeenCalledWith("https://example.test/endpoint", {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" },
    });
  });

  it("throws service/status/path message for non-ok responses", async () => {
    const response = new Response("nope", { status: 404 });
    vi.mocked(fetchWithTimeout).mockResolvedValueOnce(response);

    const apiFetch = createApiFetcher("https://example.test", "Example");
    await expect(apiFetch("/missing", 60)).rejects.toThrow(
      "Example fetch failed: 404 /missing",
    );
  });
});