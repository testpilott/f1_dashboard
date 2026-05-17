import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("fetchWithTimeout", () => {
  it("resolves with the response on a fast successful fetch", async () => {
    const mockRes = new Response(JSON.stringify({ ok: true }), { status: 200 });
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockRes);

    const res = await fetchWithTimeout("https://example.com/api");
    expect(res.status).toBe(200);
  });

  it("passes through a non-OK response without throwing", async () => {
    const mockRes = new Response("Not Found", { status: 404 });
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockRes);

    const res = await fetchWithTimeout("https://example.com/api");
    expect(res.status).toBe(404);
  });

  it("aborts when the timeout elapses before fetch resolves", async () => {
    // fetch hangs forever
    (fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
      (_url: string, { signal }: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () =>
            reject(new DOMException("The user aborted a request.", "AbortError"))
          );
        })
    );

    const promise = fetchWithTimeout("https://example.com/api", {}, 3_000);
    vi.advanceTimersByTime(3_000);

    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });
});
