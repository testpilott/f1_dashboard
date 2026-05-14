"use client";

import { useState } from "react";
import { getTeamColor, getTeamLogo } from "@/lib/constants";

interface TeamLogoProps {
  team: string;
  /** Diameter in px. Defaults to 40 — same size for every team, like TV timing. */
  size?: number;
}

/**
 * Renders a TV-style circular team logo badge.
 * Dark background with a team-colour ring — matches F1 broadcast timing graphics.
 * Logos are served from /public/logos/ (downloaded from the official F1 CDN)
 * so there are no external network dependencies at runtime.
 * Falls back to a solid team-colour disc if the image is unavailable.
 */
export default function TeamLogo({ team, size = 40 }: TeamLogoProps) {
  const [failed, setFailed] = useState(false);
  const logoPath = getTeamLogo(team);
  const color = getTeamColor(team);
  const pad = Math.max(4, Math.round(size * 0.15));

  return (
    <span
      className="inline-flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        // Dark background so white/light logos are always legible
        backgroundColor: "#18181b",
        boxShadow: `0 0 0 2px ${color}`,
        overflow: "hidden",
        padding: !logoPath || failed ? 0 : pad,
        flexShrink: 0,
      }}
      title={team}
    >
      {!logoPath || failed ? (
        /* Fallback: solid team-colour disc */
        <span
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            backgroundColor: color,
          }}
        />
      ) : (
        <img
          src={logoPath}
          alt={team}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
          }}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}


