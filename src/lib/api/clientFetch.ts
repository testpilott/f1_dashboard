/**
 * Same-origin JSON fetch for client components.
 * Throws on !res.ok so React Query error states handle failures.
 */
export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Request failed: ${res.status} ${url}`);
  return (await res.json()) as T;
}