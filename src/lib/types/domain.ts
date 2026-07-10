// ─── Open-Meteo types ─────────────────────────────────────────────────────────

export interface WeatherForecast {
  latitude: number;
  longitude: number;
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    weather_code: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    precipitation_probability: number[];
    precipitation: number[];
    wind_speed_10m: number[];
    weather_code: number[];
  };
}

// ─── News types ───────────────────────────────────────────────────────────────

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet?: string;
  source: string;
  categories?: string[];
}

// ─── Projection types ─────────────────────────────────────────────────────────

export interface DriverProjection {
  driverId: string;
  driverCode: string;
  fullName: string;
  teamName: string;
  teamColour: string;
  currentPoints: number;
  projectedPoints: {
    p10: number; // 10th percentile
    p50: number; // median
    p90: number; // 90th percentile
  };
  winProbability: number;
  podiumProbability: number;
  top5Probability: number;
}

export interface ConstructorProjection {
  constructorId: string;
  constructorName: string;
  teamColour: string;
  currentPoints: number;
  projectedPoints: {
    p10: number; // 10th percentile
    p50: number; // median
    p90: number; // 90th percentile
  };
  championProbability: number;
  top3Probability: number;
  top5Probability: number;
}

export interface ChampionshipProjection {
  season: number;
  remainingRaces: number;
  remainingSprintWeekends?: number;
  totalSimulations: number;
  drivers: DriverProjection[];
  constructors: ConstructorProjection[];
  generatedAt: string;
}

// ─── UI helper types ──────────────────────────────────────────────────────────

export type SessionTab =
  | "Practice 1"
  | "Practice 2"
  | "Practice 3"
  | "Sprint Qualifying"
  | "Sprint"
  | "Qualifying"
  | "Race";

export type TyreCompound = "SOFT" | "MEDIUM" | "HARD" | "INTERMEDIATE" | "WET";

export type SectorColor = "purple" | "green" | "yellow" | "white" | "pitlane";
