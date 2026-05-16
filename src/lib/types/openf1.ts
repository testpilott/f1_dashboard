// ─── OpenF1 types ─────────────────────────────────────────────────────────────

export interface OpenF1Session {
  session_key: number;
  session_name: string;
  session_type: "Practice" | "Qualifying" | "Race" | "Sprint" | "Sprint Qualifying";
  date_start: string;
  date_end: string;
  meeting_key: number;
  circuit_key: number;
  circuit_short_name: string;
  country_name: string;
  country_code: string;
  location: string;
  gmt_offset: string;
  year: number;
  is_cancelled: boolean;
}

export interface OpenF1Meeting {
  meeting_key: number;
  meeting_name: string;
  meeting_official_name: string;
  circuit_key: number;
  circuit_short_name: string;
  circuit_type: string;
  circuit_image?: string;
  circuit_info_url?: string;
  country_key: number;
  country_name: string;
  country_code: string;
  country_flag?: string;
  location: string;
  date_start: string;
  date_end: string;
  gmt_offset: string;
  year: number;
  is_cancelled: boolean;
}

export interface OpenF1Driver {
  driver_number: number;
  broadcast_name: string;
  first_name: string;
  last_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  headshot_url?: string;
  session_key: number;
  meeting_key: number;
}

export interface OpenF1Lap {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  lap_number: number;
  lap_duration: number | null;
  date_start: string;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  i1_speed: number | null;
  i2_speed: number | null;
  st_speed: number | null;
  is_pit_out_lap: boolean;
  segments_sector_1: number[];
  segments_sector_2: number[];
  segments_sector_3: number[];
}

export interface OpenF1Stint {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  stint_number: number;
  compound: "SOFT" | "MEDIUM" | "HARD" | "INTERMEDIATE" | "WET" | "UNKNOWN";
  lap_start: number;
  lap_end: number;
  tyre_age_at_start: number;
}

export interface OpenF1PitStop {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  lap_number: number;
  date: string;
  lane_duration: number;
  stop_duration: number | null;
}

export interface OpenF1Position {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  position: number;
  date: string;
}

export interface OpenF1Interval {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  gap_to_leader: number | string | null;
  interval: number | string | null;
  date: string;
}

export interface OpenF1SessionResult {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  position: number;
  duration: number | number[] | null;
  gap_to_leader: number | string | null;
  number_of_laps: number;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
}

export interface OpenF1Weather {
  session_key: number;
  meeting_key: number;
  date: string;
  air_temperature: number;
  track_temperature: number;
  humidity: number;
  pressure: number;
  rainfall: number;
  wind_speed: number;
  wind_direction: number;
}

export interface OpenF1RaceControl {
  session_key: number;
  meeting_key: number;
  date: string;
  category: string;
  flag: string | null;
  scope: string | null;
  sector: number | null;
  driver_number: number | null;
  lap_number: number | null;
  message: string;
}

export interface OpenF1Overtake {
  session_key: number;
  meeting_key: number;
  date: string;
  overtaking_driver_number: number;
  overtaken_driver_number: number;
  position: number;
}

export interface OpenF1Location {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  date: string;
  x: number;
  y: number;
  z: number;
}

export interface OpenF1CarData {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  date: string;
  speed: number;
  throttle: number;
  brake: number;
  rpm: number;
  n_gear: number;
  drs: number;
}

export interface OpenF1StartingGrid {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  position: number;
  lap_duration: number | null;
}
