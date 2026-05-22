import { NextResponse } from "next/server";
import { logRouteError } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { getDriversForSession } from "@/lib/api/openf1";

export const revalidate = 86400; // 24 h — headshots change ~once per season

export async function GET(req: Request) {
  const blocked = rateLimited(req, "driver-photos");
  if (blocked) return blocked;

  try {
    const drivers = await getDriversForSession("latest");
    const photos = drivers.map((d) => ({
      driver_number: d.driver_number,
      name_acronym: d.name_acronym,
      last_name: d.last_name,
      headshot_url: d.headshot_url ?? null,
    }));
    return NextResponse.json({ photos });
  } catch (err) {
    // Intentional graceful degradation: photos are decorative — when the OpenF1
    // call fails we still want pages to render, falling back to team logos.
    // We surface 200 with an empty array (NOT serverError) by design.
    logRouteError("driver-photos", err);
    return NextResponse.json({ photos: [] });
  }
}
