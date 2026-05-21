"use client";

import { useState } from "react";
import {
  isFavorite,
  parseFavorites,
  serialiseFavorites,
  STORAGE_KEY,
  toggleFavorite,
} from "@/lib/favorites";
import { useIsClient } from "@/lib/hooks/useIsClient";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return parseFavorites(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      return [];
    }
  });
  const hydrated = useIsClient();

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
