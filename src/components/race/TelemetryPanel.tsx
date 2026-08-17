"use client";

import TelemetryFallback from "@/components/race/TelemetryFallback";
import TelemetryStints from "@/components/race/TelemetryStints";

export default function TelemetryPanel({
  year,
  round,
}: {
  year: string;
  round: string;
}) {
  const showFallback = Number(year) < 2023;

  if (showFallback) {
    return <TelemetryFallback year={year} round={round} />;
  }

  return <TelemetryStints year={year} round={round} />;
}

