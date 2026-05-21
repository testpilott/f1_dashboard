import { NextResponse } from "next/server";
import { getWeatherForecast } from "@/lib/api/openmeteo";
import { CIRCUIT_COORDS } from "@/lib/constants";
import { badRequest, serverError } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";

export const revalidate = 3600; // 1 hour

export async function GET(req: Request) {
  const blocked = rateLimited(req, "weather");
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  let latitude: number | undefined;
  let longitude: number | undefined;
  let timezone = "auto";

  if (country) {
    const coords = CIRCUIT_COORDS[country];
    if (!coords) {
      return badRequest(`Unknown circuit country: ${country}`);
    }
    latitude = coords.lat;
    longitude = coords.lng;
    timezone = coords.timezone;
  } else if (lat && lng) {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      return badRequest("Invalid coordinates: lat and lng must be valid numbers");
    }
    latitude = parsedLat;
    longitude = parsedLng;
  } else {
    return badRequest("country or lat/lng required");
  }

  try {
    const forecast = await getWeatherForecast(latitude, longitude, timezone);
    return NextResponse.json(forecast);
  } catch (err) {
    return serverError("weather", err);
  }
}
