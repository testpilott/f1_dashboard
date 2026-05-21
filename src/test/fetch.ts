import { vi } from "vitest";

/**
 * Build a fetch mock that returns the first route body whose key is found in URL.
 */
export function createFetchRouter(routes: Record<string, unknown>): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    for (const [pattern, body] of Object.entries(routes)) {
      if (url.includes(pattern)) {
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    return new Response(JSON.stringify({ error: "not mocked" }), { status: 404 });
  }) as unknown as typeof fetch;
}