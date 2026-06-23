"use client";

import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import TrackSVG, {
  type IncidentMarker,
  type IncidentMeta,
  type SectorId,
} from "@/components/race/TrackSVG";
import CircuitDetailsPanel from "@/components/race/CircuitDetailsPanel";
import IncidentDialog from "@/components/race/IncidentDialog";
import MarkerTally from "@/components/race/MarkerTally";
import CornerSelector from "@/components/race/CornerSelector";
import { useCircuitData } from "@/hooks/useCircuitData";
import { buildIncidentMarkers, buildHotspotMarkers } from "@/lib/race/markers";
import {
  buildSectorMap,
  buildSectorGroups,
  toggleSectorSelection,
  toggleOneCorner,
} from "@/lib/race/sectors";

const SECTORS = [
  {
    id: 1 as SectorId,
    label: "S1",
    color: "var(--sector-1)",
    dimColor: "var(--sector-1-muted)",
    foreground: "var(--sector-1-foreground)",
    border: "var(--sector-1-border)",
  },
  {
    id: 2 as SectorId,
    label: "S2",
    color: "var(--sector-2)",
    dimColor: "var(--sector-2-muted)",
    foreground: "var(--sector-2-foreground)",
    border: "var(--sector-2-border)",
  },
  {
    id: 3 as SectorId,
    label: "S3",
    color: "var(--sector-3)",
    dimColor: "var(--sector-3-muted)",
    foreground: "var(--sector-3-foreground)",
    border: "var(--sector-3-border)",
  },
];

export default function CircuitMap({ year, round }: { year: string; round: string }) {
  const [selectedCorners, setSelectedCorners] = useState<Set<number>>(new Set());
  const [selectedIncident, setSelectedIncident] = useState<IncidentMeta | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, incidentsData, isLoading, isError } = useCircuitData(year, round);

  const incidentMarkers = useMemo(
    () => buildIncidentMarkers(incidentsData),
    [incidentsData],
  );
  const hotspotMarkers = useMemo(
    () => buildHotspotMarkers(data?.details, data?.corners),
    [data?.details, data?.corners],
  );
  const markers = useMemo<IncidentMarker[]>(
    () => [...hotspotMarkers, ...incidentMarkers],
    [hotspotMarkers, incidentMarkers],
  );
  const sectorMap = useMemo(() => buildSectorMap(data?.corners), [data?.corners]);

  if (isLoading) return <Skeleton className="h-[480px] w-full mt-4 rounded-lg" />;

  if (isError || !data?.available) {
    return (
      <p className="text-muted-foreground text-sm mt-4">
        {data?.reason ?? "Circuit map unavailable."}
      </p>
    );
  }

  const corners = data.corners ?? [];
  const sectorGroups = buildSectorGroups(SECTORS, corners, sectorMap, selectedCorners);

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-lg border border-border bg-surface-2 p-3 sm:p-5">
        <TrackSVG
          data={data}
          selectedCorners={selectedCorners}
          sectorMap={sectorMap}
          sectorStyles={SECTORS}
          markers={markers}
          onMarkerClick={(meta) => {
            setSelectedIncident(meta);
            setDialogOpen(true);
          }}
        />
        <MarkerTally
          incidentCount={incidentMarkers.length}
          hotspotCount={hotspotMarkers.length}
        />
      </div>

      <CircuitDetailsPanel circuitId={data?.circuitId ?? ""} details={data?.details} />

      <IncidentDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedIncident(null);
        }}
        incident={selectedIncident}
      />

      <CornerSelector
        sectorGroups={sectorGroups}
        selectedCorners={selectedCorners}
        onToggleSector={(id) =>
          setSelectedCorners((prev) => toggleSectorSelection(prev, id, corners, sectorMap))
        }
        onToggleCorner={(n) => setSelectedCorners((prev) => toggleOneCorner(prev, n))}
        onClearSelection={() => setSelectedCorners(new Set())}
      />
    </div>
  );
}
