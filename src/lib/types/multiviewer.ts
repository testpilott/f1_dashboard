// ─── Multiviewer Circuit Info API ────────────────────────────────────────────
// https://api.multiviewer.app/api/v1/circuits/{circuit_key}/{year}
// Referenced by OpenF1 /meetings as `circuit_info_url`.

export interface MultiviewerCorner {
  /** Sequential corner number around the lap. */
  number: number;
  /** Turning angle in degrees. */
  angle: number;
  /** Distance from start (metres). */
  length: number;
  /** Position in track coordinate space (same axes as the x/y outline arrays). */
  trackPosition: { x: number; y: number };
}

export interface MultiviewerCircuitInfo {
  corners: MultiviewerCorner[];
  /** Track centreline x coordinates (dense polyline). */
  x: number[];
  /** Track centreline y coordinates (dense polyline, y increases upward — flip for SVG). */
  y: number[];
  /** Cumulative elapsed time at each track-outline point (seconds from start). */
  trackPositionTime?: number[];
  /** Clockwise rotation offset applied to align the map north-up (degrees). */
  rotation: number;
  /** ISO date of the most recent race at this circuit in this year's data. */
  raceDate?: string;
  meetingName?: string;
  meetingOfficialName?: string | null;
  round?: number;
}
