export type SearchResultKind = "driver" | "constructor" | "circuit" | "race";

export interface SearchResult {
  kind: SearchResultKind;
  id: string;
  label: string;
  sublabel?: string;
  href: string;
}

export interface SearchIndex {
  drivers: SearchResult[];
  constructors: SearchResult[];
  circuits: SearchResult[];
  races: SearchResult[];
}

/** Normalise a string for substring matching (lower, remove punctuation). */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Search the index for a query string.
 * Returns up to `limit` results ranked by match quality (prefix > infix).
 */
export function search(index: SearchIndex, rawQuery: string, limit = 10): SearchResult[] {
  const q = norm(rawQuery);
  if (q.length < 1) return [];

  const all: Array<{ item: SearchResult; score: number }> = [];

  for (const items of [index.drivers, index.constructors, index.circuits, index.races]) {
    for (const item of items) {
      const haystack = norm(item.label + " " + (item.sublabel ?? ""));
      if (!haystack.includes(q)) continue;
      // Prefix match scores higher than infix
      const score = haystack.startsWith(q) ? 2 : 1;
      all.push({ item, score });
    }
  }

  return all
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);
}
