"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
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
  type IncidentMarker,
  type IncidentMeta,
  type SectorId,
} from "@/components/race/TrackSVG";
import CircuitDetailsPanel from "@/components/race/CircuitDetailsPanel";
import { useCircuitData } from "@/hooks/useCircuitData";

const SECTORS = [
  {
    id: 1,
    label: "S1",
    color: "var(--sector-1)",
    dimColor: "var(--sector-1-muted)",
    foreground: "var(--sector-1-foreground)",
    border: "var(--sector-1-border)",
  },
  {
    id: 2,
    label: "S2",
    color: "var(--sector-2)",
    dimColor: "var(--sector-2-muted)",
    foreground: "var(--sector-2-foreground)",
    border: "var(--sector-2-border)",
  },
  {
    id: 3,
    label: "S3",
    color: "var(--sector-3)",
    dimColor: "var(--sector-3-muted)",
    foreground: "var(--sector-3-foreground)",
    border: "var(--sector-3-border)",
  },
] as const;

function activeSectorStyle(sector: (typeof SECTORS)[number]): CSSProperties {
  return {
    backgroundColor: sector.dimColor,
    borderColor: sector.border,
    color: sector.foreground,
  };
}

function chipSectorStyle(sector: (typeof SECTORS)[number]): CSSProperties {
  return {
    backgroundColor: sector.dimColor,
    borderColor: sector.border,
    color: sector.foreground,
  };
}

export default function CircuitMap({ year, round }: { year: string; round: string }) {
  const [selectedCorners, setSelectedCorners] = useState<Set<number>>(new Set());
  const [selectedIncident, setSelectedIncident] = useState<IncidentMeta | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, incidentsData, isLoading, isError } = useCircuitData(year, round);

  const incidentMarkers = useMemo<IncidentMarker[]>(() => {
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
          type: "incident" as const,
        },
      }));
  }, [incidentsData]);

  /**
   * Curated hotspots from circuitDetails — join the hotspot's corner number
   * to the live Multiviewer corners[] geometry so the marker lands on the
   * actual track location. Hotspots whose `corner` doesn't match any of the
   * route-returned corners are silently dropped (the corner-number-drift
   * gotcha called out in CIRCUIT_DETAILS_HANDOFF.md Phase 1).
   */
  const hotspotMarkers = useMemo<IncidentMarker[]>(() => {
    const hotspots = data?.details?.notableHotspots ?? [];
    const corners = data?.corners ?? [];
    if (hotspots.length === 0 || corners.length === 0) return [];
    const out: IncidentMarker[] = [];
    for (const h of hotspots) {
      const corner = corners.find((c) => c.number === h.corner);
      if (!corner) continue;
      out.push({
        x: corner.x,
        y: corner.y,
        meta: {
          lap_number: null,
          driver_number: null,
          flag: null,
          category: "Hotspot",
          message: h.description,
          type: "hotspot",
          name: h.name,
          description: h.description,
        },
      });
    }
    return out;
  }, [data?.details?.notableHotspots, data?.corners]);

  const markers = useMemo<IncidentMarker[]>(
    () => [...hotspotMarkers, ...incidentMarkers],
    [hotspotMarkers, incidentMarkers],
  );

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
            {/*
             * Preserve the legacy phrasing when only incidents are shown so
             * the surface text stays stable for visitors who have only ever
             * seen race-day data; only switch to the combined form when
             * curated hotspots are also present.
             */}
            {hotspotMarkers.length === 0 ? (
              <>
                {incidentMarkers.length} incident marker
                {incidentMarkers.length !== 1 ? "s" : ""} — click to view detail
              </>
            ) : incidentMarkers.length === 0 ? (
              <>
                {hotspotMarkers.length} notable corner
                {hotspotMarkers.length !== 1 ? "s" : ""} — click to view detail
              </>
            ) : (
              <>
                {incidentMarkers.length} incident
                {incidentMarkers.length !== 1 ? "s" : ""} · {hotspotMarkers.length} notable corner
                {hotspotMarkers.length !== 1 ? "s" : ""} — click to view detail
              </>
            )}
          </p>
        )}
      </div>

      <CircuitDetailsPanel circuitId={data?.circuitId ?? ""} details={data?.details} />

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
                {selectedIncident?.type === "hotspot"
                  ? (selectedIncident.name ?? "Notable corner")
                  : selectedIncident?.category === "CarEvent"
                    ? "Incident"
                    : selectedIncident?.flag
                      ? `${selectedIncident.flag} Flag`
                      : "Race Control"}
              </DialogTitle>
              <DialogClose aria-label="Close" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <X size={16} />
              </DialogClose>
            </div>

            {selectedIncident?.type === "hotspot" ? (
              <div className="text-sm text-foreground/90 leading-relaxed">
                {selectedIncident.description ?? selectedIncident.message}
              </div>
            ) : selectedIncident ? (
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
            ) : null}

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
                  className="text-xs font-bold px-2.5 py-0.5 rounded border cursor-pointer select-none transition-colors hover:brightness-110"
                  style={s.allSelected ? activeSectorStyle(s) : chipSectorStyle(s)}
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
                          ? "hover:brightness-110"
                          : "border-border bg-surface-3 text-foreground/70 hover:bg-surface-2",
                      )}
                      style={
                        isSelected
                          ? {
                              backgroundColor: s.dimColor,
                              borderColor: s.border,
                              color: s.foreground,
                            }
                          : undefined
                      }
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
