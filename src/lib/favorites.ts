const STORAGE_KEY = "f1_favorite_drivers";

export function parseFavorites(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

export function serialiseFavorites(ids: string[]): string {
  return JSON.stringify(ids);
}

export function toggleFavorite(current: string[], driverId: string): string[] {
  return current.includes(driverId)
    ? current.filter((id) => id !== driverId)
    : [...current, driverId];
}

export function isFavorite(ids: string[], driverId: string): boolean {
  return ids.includes(driverId);
}

export function sortFavoritesFirst<T>(
  items: T[],
  getId: (item: T) => string,
  favorites: string[]
): T[] {
  const fav = new Set(favorites);
  const favoritesFirst: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    if (fav.has(getId(item))) favoritesFirst.push(item);
    else rest.push(item);
  }
  return [...favoritesFirst, ...rest];
}

export { STORAGE_KEY };
