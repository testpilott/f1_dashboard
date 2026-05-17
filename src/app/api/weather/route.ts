import { NextResponse } from "next/server";
import { getWeatherForecast } from "@/lib/api/openmeteo";
import { CIRCUIT_COORDS } from "@/lib/constants";
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
      return NextResponse.json({ error: `Unknown circuit country: ${country}` }, { status: 400 });
    }
    latitude = coords.lat;
    longitude = coords.lng;
    timezone = coords.timezone;
  } else if (lat && lng) {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      return NextResponse.json(
        { error: "Invalid coordinates: lat and lng must be valid numbers" },
        { status: 400 }
      );
    }
    latitude = parsedLat;
    longitude = parsedLng;
  } else {
    return NextResponse.json({ error: "country or lat/lng required" }, { status: 400 });
  }

  try {
    const forecast = await getWeatherForecast(latitude, longitude, timezone);
    return NextResponse.json(forecast);
  } catch (err) {
    return NextResponse.json(
      { error: "Weather fetch failed", detail: String(err) },
      { status: 500 }
    );
  }
}
