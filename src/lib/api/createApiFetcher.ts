import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";

/**
 * Build a typed fetch wrapper for one external API.
 */
export function createApiFetcher(baseUrl: string, serviceName: string) {
  return async function apiFetch<T>(path: string, revalidate: number): Promise<T> {
    const res = await fetchWithTimeout(`${baseUrl}${path}`, {
      next: { revalidate },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`${serviceName} fetch failed: ${res.status} ${path}`);
    }
    return res.json() as Promise<T>;
  };
}