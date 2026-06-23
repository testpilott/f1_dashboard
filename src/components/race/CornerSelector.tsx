"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { CircuitCorner, SectorId } from "@/components/race/TrackSVG";
import type { SectorGroup } from "@/lib/race/sectors";

interface SectorEntry {
  id: SectorId;
  label: string;
  dimColor: string;
  foreground: string;
  border: string;
}

interface Props {
  sectorGroups: SectorGroup<SectorEntry>[];
  selectedCorners: Set<number>;
  onToggleSector: (id: SectorId) => void;
  onToggleCorner: (cornerNumber: number) => void;
  onClearSelection: () => void;
}

function sectorChipStyle(sector: SectorEntry): CSSProperties {
  return {
    backgroundColor: sector.dimColor,
    borderColor: sector.border,
    color: sector.foreground,
  };
}

function cornerStyle(sector: SectorEntry): CSSProperties {
  return {
    backgroundColor: sector.dimColor,
    borderColor: sector.border,
    color: sector.foreground,
  };
}

export default function CornerSelector({
  sectorGroups,
  selectedCorners,
  onToggleSector,
  onToggleCorner,
  onClearSelection,
}: Props) {
  const hasCorners = sectorGroups.some((g) => g.corners.length > 0);
  if (!hasCorners) return null;

  return (
    <div className="space-y-3">
      {sectorGroups.map((g) => (
        <div key={g.sector.id}>
          <div className="flex items-center gap-2 mb-1.5">
            <button
              onClick={() => onToggleSector(g.sector.id)}
              className="text-xs font-bold px-2.5 py-0.5 rounded border cursor-pointer select-none transition-colors hover:brightness-110"
              style={sectorChipStyle(g.sector)}
            >
              {g.sector.label}
            </button>
            <span className="text-xs text-muted-foreground">{g.corners.length} corners</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {g.corners.map((c: CircuitCorner, idx: number) => {
              const isSelected = selectedCorners.has(c.number);
              return (
                <button
                  key={`${g.sector.id}-${c.number}-${idx}`}
                  onClick={() => onToggleCorner(c.number)}
                  className={cn(
                    "flex items-center justify-center w-10 h-8 rounded border text-xs font-mono font-semibold tabular-nums transition-all cursor-pointer select-none",
                    isSelected
                      ? "hover:brightness-110"
                      : "border-border bg-surface-3 text-foreground/70 hover:bg-surface-2",
                  )}
                  style={isSelected ? cornerStyle(g.sector) : undefined}
                >
                  T{c.number}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {selectedCorners.size > 0 && (
        <button
          onClick={onClearSelection}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear selection ({selectedCorners.size})
        </button>
      )}
    </div>
  );
}
