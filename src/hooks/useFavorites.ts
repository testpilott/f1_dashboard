"use client";

import { useEffect, useState } from "react";
import {
  isFavorite,
  parseFavorites,
  serialiseFavorites,
  STORAGE_KEY,
  toggleFavorite,
} from "@/lib/favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setFavorites(parseFavorites(localStorage.getItem(STORAGE_KEY)));
    } catch {
      setFavorites([]);
    }
    setHydrated(true);
  }, []);

  function toggle(driverId: string) {
    setFavorites((prev) => {
      const next = toggleFavorite(prev, driverId);
      try {
        localStorage.setItem(STORAGE_KEY, serialiseFavorites(next));
      } catch {
        // Ignore localStorage write failures.
      }
      return next;
    });
  }

  return {
    favorites,
    hydrated,
    toggle,
    isFavorite: (id: string) => isFavorite(favorites, id),
  };
}
