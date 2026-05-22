import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { logRouteError } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { getDriversForSession } from "@/lib/api/openf1";
import { currentEtWeekBucket, WEEKLY_CACHE_REVALIDATE_SECONDS } from "@/lib/time/weeklyCache";

export const revalidate = 604800; // 7 d — refresh at Monday 00:00 ET via week bucket

const getCachedDriverPhotos = unstable_cache(
  async (_weekBucket: string) => {
    const drivers = await getDriversForSession("latest");
    return drivers.map((d) => ({
      driver_number: d.driver_number,
      name_acronym: d.name_acronym,
      last_name: d.last_name,
      headshot_url: d.headshot_url ?? null,
    }));
  },
  ["driver-photos-v2-weekly"],
  { revalidate: WEEKLY_CACHE_REVALIDATE_SECONDS, tags: ["driver-photos"] }
);

export async function GET(req: Request) {
  const blocked = rateLimited(req, "driver-photos");
  if (blocked) return blocked;

  try {
    const weekBucket = currentEtWeekBucket();
    const photos = await getCachedDriverPhotos(weekBucket);
    return NextResponse.json({ photos });
  } catch (err) {
    // Intentional graceful degradation: photos are decorative — when the OpenF1
    // call fails we still want pages to render, falling back to team logos.
    // We surface 200 with an empty array (NOT serverError) by design.
    logRouteError("driver-photos", err);
    return NextResponse.json({ photos: [] });
  }
}
