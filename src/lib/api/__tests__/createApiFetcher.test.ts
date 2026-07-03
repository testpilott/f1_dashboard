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

  describe("single-flight coalescing", () => {
    it("collapses concurrent identical requests into one upstream fetch", async () => {
      let resolveFetch!: (r: Response) => void;
      vi.mocked(fetchWithTimeout).mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
      );

      const apiFetch = createApiFetcher("https://example.test", "Example");
      const first = apiFetch<{ n: number }>("/same", 60);
      const second = apiFetch<{ n: number }>("/same", 60);

      resolveFetch(new Response(JSON.stringify({ n: 1 }), { status: 200 }));

      await expect(first).resolves.toEqual({ n: 1 });
      await expect(second).resolves.toEqual({ n: 1 });
      expect(fetchWithTimeout).toHaveBeenCalledTimes(1);
    });

    it("does not coalesce requests to different paths", async () => {
      vi.mocked(fetchWithTimeout)
        .mockResolvedValueOnce(new Response(JSON.stringify({ p: "a" }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ p: "b" }), { status: 200 }));

      const apiFetch = createApiFetcher("https://example.test", "Example");
      const [a, b] = await Promise.all([
        apiFetch<{ p: string }>("/a", 60),
        apiFetch<{ p: string }>("/b", 60),
      ]);

      expect(a).toEqual({ p: "a" });
      expect(b).toEqual({ p: "b" });
      expect(fetchWithTimeout).toHaveBeenCalledTimes(2);
    });

    it("does not coalesce sequential requests (fetches again after settle)", async () => {
      vi.mocked(fetchWithTimeout)
        .mockResolvedValueOnce(new Response(JSON.stringify({ n: 1 }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ n: 2 }), { status: 200 }));

      const apiFetch = createApiFetcher("https://example.test", "Example");
      await expect(apiFetch<{ n: number }>("/seq", 60)).resolves.toEqual({ n: 1 });
      await expect(apiFetch<{ n: number }>("/seq", 60)).resolves.toEqual({ n: 2 });
      expect(fetchWithTimeout).toHaveBeenCalledTimes(2);
    });

    it("propagates one failure to all coalesced callers, then allows a fresh attempt", async () => {
      // First round: a permanent 404 shared by both concurrent callers.
      vi.mocked(fetchWithTimeout).mockResolvedValueOnce(new Response("nope", { status: 404 }));

      const apiFetch = createApiFetcher("https://example.test", "Example");
      const first = apiFetch("/gone", 60);
      const second = apiFetch("/gone", 60);
      await expect(first).rejects.toThrow(/404/);
      await expect(second).rejects.toThrow(/404/);
      expect(fetchWithTimeout).toHaveBeenCalledTimes(1);

      // The failed entry must not be cached: a later call fetches again.
      vi.mocked(fetchWithTimeout).mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
      await expect(apiFetch("/gone", 60)).resolves.toEqual({ ok: true });
      expect(fetchWithTimeout).toHaveBeenCalledTimes(2);
    });

    it("keys coalescing on revalidate as well as path", async () => {
      vi.mocked(fetchWithTimeout)
        .mockResolvedValueOnce(new Response(JSON.stringify({ n: 1 }), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ n: 2 }), { status: 200 }));

      const apiFetch = createApiFetcher("https://example.test", "Example");
      await Promise.all([apiFetch("/x", 60), apiFetch("/x", 300)]);
      expect(fetchWithTimeout).toHaveBeenCalledTimes(2);
    });
  });
});