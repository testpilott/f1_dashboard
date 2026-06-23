interface Props {
  incidentCount: number;
  hotspotCount: number;
}

export default function MarkerTally({ incidentCount, hotspotCount }: Props) {
  if (incidentCount === 0 && hotspotCount === 0) return null;

  if (hotspotCount === 0) {
    return (
      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        {incidentCount} incident marker{incidentCount !== 1 ? "s" : ""} — click to view detail
      </p>
    );
  }

  if (incidentCount === 0) {
    return (
      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        {hotspotCount} notable corner{hotspotCount !== 1 ? "s" : ""} — click to view detail
      </p>
    );
  }

  return (
    <p className="text-[10px] text-muted-foreground mt-2 text-center">
      {/*
       * Preserve the legacy phrasing when only incidents are shown so
       * the surface text stays stable for visitors who have only ever
       * seen race-day data; only switch to the combined form when
       * curated hotspots are also present.
       */}
      {incidentCount} incident{incidentCount !== 1 ? "s" : ""} · {hotspotCount} notable corner
      {hotspotCount !== 1 ? "s" : ""} — click to view detail
    </p>
  );
}
