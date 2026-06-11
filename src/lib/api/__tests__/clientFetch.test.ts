import { describe, expect, it, vi } from "vitest";
import { fetchJson } from "@/lib/api/clientFetch";

describe("fetchJson", () => {
  it("returns parsed JSON for ok responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ ok: true, items: [1, 2, 3] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(fetchJson<{ ok: boolean; items: number[] }>("/api/test")).resolves.toEqual({
      ok: true,
      items: [1, 2, 3],
    });
  });

  it("throws with status for non-ok responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Not found", { status: 404 })),
    );

    await expect(fetchJson("/api/missing")).rejects.toThrow("Request failed: 404 /api/missing");
  });

  it("rejects when response JSON is malformed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("{", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(fetchJson("/api/bad-json")).rejects.toBeTruthy();
  });
});