"use client";

import { ExternalLink } from "lucide-react";
import type { CircuitDetails } from "@/lib/constants/circuitDetails";
import { getCircuitWikipediaUrl } from "@/lib/constants/circuitDetails";

interface Props {
  /** Jolpica/Ergast circuitId. May be empty when the route hasn't returned yet. */
  circuitId: string;
  /** Curated details. When undefined the panel renders nothing. */
  details: CircuitDetails | undefined;
}

/**
 * Stats + notable-corners card shown under the Circuit map.
 * Renders nothing when the circuit isn't seeded in CIRCUIT_DETAILS so older
 * / unseeded circuits don't show a broken half-populated panel.
 */
export default function CircuitDetailsPanel({ circuitId, details }: Props) {
  if (!details) return null;
  const wikiUrl = getCircuitWikipediaUrl(circuitId);

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3 sm:p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-foreground">Circuit details</h3>
        {wikiUrl && (
          <a
            href={wikiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Wikipedia
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCell label="Length" value={`${details.lengthMeters.toLocaleString()} m`} />
        <StatCell label="Turns" value={String(details.turnCount)} />
        <StatCell label="Elevation" value={`${details.elevationGainMeters} m`} />
        <StatCell label="Max bank" value={`${details.maxBankingDegrees}°`} />
      </div>

      {details.notableHotspots.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Notable corners
          </h4>
          <ul className="space-y-2">
            {details.notableHotspots.map((h) => (
              <li
                key={h.corner}
                className="rounded-md bg-surface-3/60 px-3 py-2"
              >
                <div className="text-sm font-medium text-foreground">
                  T{h.corner} — {h.name}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {h.description}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface-3/60 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium font-mono tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
}
