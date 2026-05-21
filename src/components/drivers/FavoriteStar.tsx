"use client";

export default function FavoriteStar({
  driverId,
  isFavorite,
  onToggle,
}: {
  driverId: string;
  isFavorite: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={isFavorite}
      data-driver-id={driverId}
      className="absolute top-2 right-2 z-10 rounded-md px-1.5 py-1 text-base leading-none bg-surface-3/90 border border-border hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span aria-hidden="true">{isFavorite ? "★" : "☆"}</span>
    </button>
  );
}
