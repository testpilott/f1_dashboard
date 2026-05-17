import type { WeatherForecast } from "@/lib/types";
import { fetchWithTimeout } from "@/lib/api/fetchWithTimeout";

const OPENMETEO_BASE = "https://api.open-meteo.com/v1";

const HOURLY_VARS = [
  "temperature_2m",
  "relative_humidity_2m",
  "precipitation_probability",
  "precipitation",
  "wind_speed_10m",
  "weather_code",
].join(",");

const CURRENT_VARS = [
  "temperature_2m",
  "relative_humidity_2m",
  "precipitation",
  "wind_speed_10m",
  "wind_direction_10m",
  "weather_code",
].join(",");

export async function getWeatherForecast(
  lat: number,
  lng: number,
  timezone = "auto"
): Promise<WeatherForecast> {
  const url =
    `${OPENMETEO_BASE}/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&current=${CURRENT_VARS}` +
    `&hourly=${HOURLY_VARS}` +
    `&timezone=${timezone}` +
    `&forecast_days=7`;

  const res = await fetchWithTimeout(url, { next: { revalidate: 3600 } }); // cache 1 hour
  if (!res.ok) throw new Error(`Open-Meteo fetch failed: ${res.status}`);
  return res.json() as Promise<WeatherForecast>;
}

export async function getHistoricalWeather(
  lat: number,
  lng: number,
  startDate: string, // YYYY-MM-DD
  endDate: string
): Promise<{ hourly: { time: string[]; temperature_2m: number[]; precipitation: number[] } }> {
  const url =
    `https://archive-api.open-meteo.com/v1/archive` +
    `?latitude=${lat}&longitude=${lng}` +
    `&start_date=${startDate}&end_date=${endDate}` +
    `&hourly=temperature_2m,precipitation`;

  const res = await fetch(url, { next: { revalidate: 86400 } }); // cache 24 hours
  if (!res.ok) throw new Error(`Open-Meteo historical fetch failed: ${res.status}`);
  return res.json();
}
