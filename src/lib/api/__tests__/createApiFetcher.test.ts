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

  it("passes a custom timeout through to fetchWithTimeout when provided", async () => {
    const response = new Response(JSON.stringify({ ok: true }), { status: 200 });
    vi.mocked(fetchWithTimeout).mockResolvedValueOnce(response);

    const apiFetch = createApiFetcher("https://example.test", "Example", 2, 30_000);
    await apiFetch("/slow", 300);

    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "https://example.test/slow",
      { next: { revalidate: 300 }, headers: { Accept: "application/json" } },
      30_000,
    );
  });

  it("throws service/status/path message for non-ok responses", async () => {
    const response = new Response("nope", { status: 404 });
    vi.mocked(fetchWithTimeout).mockResolvedValueOnce(response);

    const apiFetch = createApiFetcher("https://example.test", "Example");
    await expect(apiFetch("/missing", 60)).rejects.toThrow(
      "Example fetch failed: 404 /missing",
    );
  });

  it("retries transient 429 responses and eventually succeeds", async () => {
    vi.mocked(fetchWithTimeout)
      .mockResolvedValueOnce(new Response("rate limited", { status: 429 }))
      .mockResolvedValueOnce(new Response("rate limited", { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const apiFetch = createApiFetcher("https://example.test", "Example");
    const out = await apiFetch<{ ok: boolean }>("/path", 60);

    expect(out).toEqual({ ok: true });
    expect(fetchWithTimeout).toHaveBeenCalledTimes(3);
  });

  it("retries timeout (AbortError) and eventually succeeds", async () => {
    const abort = new DOMException("aborted", "AbortError");
    vi.mocked(fetchWithTimeout)
      .mockRejectedValueOnce(abort)
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const apiFetch = createApiFetcher("https://example.test", "Example");
    const out = await apiFetch<{ ok: boolean }>("/path", 60);

    expect(out).toEqual({ ok: true });
    expect(fetchWithTimeout).toHaveBeenCalledTimes(2);
  });

  it("does not retry permanent 404 responses", async () => {
    vi.mocked(fetchWithTimeout).mockResolvedValue(new Response("missing", { status: 404 }));

    const apiFetch = createApiFetcher("https://example.test", "Example");
    await expect(apiFetch("/missing", 60)).rejects.toThrow(/404/);
    expect(fetchWithTimeout).toHaveBeenCalledTimes(1);
  });

  it("stops after MAX_ATTEMPTS retries when failures persist", async () => {
    vi.mocked(fetchWithTimeout).mockResolvedValue(new Response("nope", { status: 500 }));

    const apiFetch = createApiFetcher("https://example.test", "Example");
    await expect(apiFetch("/flaky", 60)).rejects.toThrow(/500/);
    expect(fetchWithTimeout).toHaveBeenCalledTimes(3);
  });
});