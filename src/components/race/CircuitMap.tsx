"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSectorId } from "@/lib/geometry/track";
import TrackSVG, {
  type CircuitInfoPayload,
  type IncidentMarker,
  type IncidentMeta,
  type SectorId,
} from "@/components/race/TrackSVG";

const SECTORS = [
  {
    id: 1,
    label: "S1",
    color: "#10b981",
    dimColor: "rgba(16,185,129,0.18)",
    textClass: "text-emerald-400",
    ringClass: "ring-emerald-500/60",
    btnActiveClass: "bg-emerald-500/20 border-emerald-500/50 text-emerald-300",
    chipClass: "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25",
  },
  {
    id: 2,
    label: "S2",
    color: "#f59e0b",
    dimColor: "rgba(245,158,11,0.18)",
    textClass: "text-amber-400",
    ringClass: "ring-amber-500/60",
    btnActiveClass: "bg-amber-500/20 border-amber-500/50 text-amber-300",
    chipClass: "bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25",
  },
  {
    id: 3,
    label: "S3",
    color: "#3b82f6",
    dimColor: "rgba(59,130,246,0.18)",
    textClass: "text-blue-400",
    ringClass: "ring-blue-500/60",
    btnActiveClass: "bg-blue-500/20 border-blue-500/50 text-blue-300",
    chipClass: "bg-blue-500/15 border-blue-500/40 text-blue-400 hover:bg-blue-500/25",
  },
] as const;

interface IncidentsPayload {
  available: boolean;
  reason?: string;
  incidents?: Array<{
    x: number | null;
    y: number | null;
    lap_number: number | null;
    driver_number: number | null;
    flag: string | null;
    category: string;
    message: string;
  }>;
}

async function fetchCircuitInfo(year: string, round: string): Promise<CircuitInfoPayload> {
  const res = await fetch(
    `/api/circuit-info?year=${encodeURIComponent(year)}&round=${encodeURIComponent(round)}`,
  );
  if (!res.ok) throw new Error("Failed to load circuit info");
  return res.json() as Promise<CircuitInfoPayload>;
}

async function fetchRaceIncidents(year: string, round: string): Promise<IncidentsPayload> {
  const res = await fetch(
    `/api/race-incidents?year=${encodeURIComponent(year)}&round=${encodeURIComponent(round)}`,
  );
  if (!res.ok) return { available: false, reason: "Failed to load incidents" };
  return res.json() as Promise<IncidentsPayload>;
}

export default function CircuitMap({ year, round }: { year: string; round: string }) {
  const [selectedCorners, setSelectedCorners] = useState<Set<number>>(new Set());
  const [selectedIncident, setSelectedIncident] = useState<IncidentMeta | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading, isError } = useQuery<CircuitInfoPayload>({
    queryKey: ["circuit-info", year, round],
    queryFn: () => fetchCircuitInfo(year, round),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { data: incidentsData } = useQuery<IncidentsPayload>({
    queryKey: ["race-incidents", year, round],
    queryFn: () => fetchRaceIncidents(year, round),
    staleTime: 5 * 60 * 1000,
  });

  const markers = useMemo<IncidentMarker[]>(() => {
    if (!incidentsData?.available || !incidentsData.incidents) return [];
    return incidentsData.incidents
      .filter((inc) => inc.x != null && inc.y != null)
      .map((inc) => ({
        x: inc.x!,
        y: inc.y!,
        meta: {
          lap_number: inc.lap_number,
          driver_number: inc.driver_number,
          flag: inc.flag,
          category: inc.category,
          message: inc.message,
        },
      }));
  }, [incidentsData]);

  const sectorMap = useMemo<Map<number, SectorId>>(() => {
    const corners = data?.corners ?? [];
    if (corners.length === 0) return new Map();
    const maxLen = Math.max(...corners.map((c) => c.length), 1);
    return new Map(corners.map((c) => [c.number, getSectorId(c, maxLen)]));
  }, [data?.corners]);

  const toggleCorner = (n: number) => {
    setSelectedCorners((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const toggleSector = (sectorId: SectorId) => {
    const inSector = (data?.corners ?? [])
      .filter((c) => (sectorMap.get(c.number) ?? 1) === sectorId)
      .map((c) => c.number);

    setSelectedCorners((prev) => {
      const allOn = inSector.every((n) => prev.has(n));
      const next = new Set(prev);
      if (allOn) inSector.forEach((n) => next.delete(n));
      else inSector.forEach((n) => next.add(n));
      return next;
    });
  };

  const handleMarkerClick = (meta: IncidentMeta) => {
    setSelectedIncident(meta);
    setDialogOpen(true);
  };

  if (isLoading) return <Skeleton className="h-[480px] w-full mt-4 rounded-lg" />;

  if (isError || !data?.available) {
    return (
      <p className="text-muted-foreground text-sm mt-4">
        {data?.reason ?? "Circuit map unavailable."}
      </p>
    );
  }

  const corners = data.corners ?? [];

  const sectorGroups = SECTORS.map((s) => ({
    ...s,
    corners: corners.filter((c) => (sectorMap.get(c.number) ?? 1) === s.id),
    allSelected:
      corners
        .filter((c) => (sectorMap.get(c.number) ?? 1) === s.id)
        .every((c) => selectedCorners.has(c.number)) &&
      corners.filter((c) => (sectorMap.get(c.number) ?? 1) === s.id).length > 0,
  }));

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-lg border border-border bg-surface-2 p-3 sm:p-5">
        <TrackSVG
          data={data}
          selectedCorners={selectedCorners}
          sectorMap={sectorMap}
          sectorStyles={SECTORS}
          markers={markers}
          onMarkerClick={handleMarkerClick}
        />
        {markers.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            {markers.length} incident marker{markers.length !== 1 ? "s" : ""} — click to view detail
          </p>
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedIncident(null);
        }}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup>
            <div className="flex items-center justify-between mb-3">
              <DialogTitle className="text-base font-bold">
                {selectedIncident?.category === "CarEvent"
                  ? "Incident"
                  : selectedIncident?.flag
                    ? `${selectedIncident.flag} Flag`
                    : "Race Control"}
              </DialogTitle>
              <DialogClose aria-label="Close" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <X size={16} />
              </DialogClose>
            </div>

            {selectedIncident && (
              <div className="space-y-2 text-sm">
                {selectedIncident.lap_number != null && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-20 shrink-0">Lap</span>
                    <span className="font-mono font-semibold">{selectedIncident.lap_number}</span>
                  </div>
                )}
                {selectedIncident.driver_number != null && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-20 shrink-0">Driver #</span>
                    <span className="font-mono font-semibold">{selectedIncident.driver_number}</span>
                  </div>
                )}
                {selectedIncident.flag && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-20 shrink-0">Flag</span>
                    <span className="font-semibold">{selectedIncident.flag}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-20 shrink-0">Message</span>
                  <span className="text-foreground/90 leading-relaxed">{selectedIncident.message}</span>
                </div>
              </div>
            )}

            <DialogDescription className="sr-only">
              Race control incident detail
            </DialogDescription>
          </DialogPopup>
        </DialogPortal>
      </Dialog>

      {corners.length > 0 && (
        <div className="space-y-3">
          {sectorGroups.map((s) => (
            <div key={s.id}>
              <div className="flex items-center gap-2 mb-1.5">
                <button
                  onClick={() => toggleSector(s.id as SectorId)}
                  className={cn(
                    "text-xs font-bold px-2.5 py-0.5 rounded border cursor-pointer select-none transition-colors",
                    s.allSelected ? s.btnActiveClass : s.chipClass,
                  )}
                >
                  {s.label}
                </button>
                <span className="text-xs text-muted-foreground">{s.corners.length} corners</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {s.corners.map((c, idx) => {
                  const isSelected = selectedCorners.has(c.number);
                  return (
                    <button
                      key={`${s.id}-${c.number}-${idx}`}
                      onClick={() => toggleCorner(c.number)}
                      className={cn(
                        "flex items-center justify-center w-10 h-8 rounded border text-xs font-mono font-semibold tabular-nums transition-all cursor-pointer select-none",
                        isSelected
                          ? s.btnActiveClass
                          : "border-border bg-surface-3 text-foreground/70 hover:bg-surface-2",
                      )}
                      style={isSelected ? { borderColor: s.color, color: s.color } : undefined}
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
              onClick={() => setSelectedCorners(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear selection ({selectedCorners.size})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
