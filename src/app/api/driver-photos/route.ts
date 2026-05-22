import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { logRouteError } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { getDriversForSession } from "@/lib/api/openf1";
import type { OpenF1Driver } from "@/lib/types";

type DriverPhoto = Pick<OpenF1Driver, "driver_number" | "name_acronym" | "last_name"> & {
  headshot_url: string | null;
};

const DRIVER_PHOTOS_REVALIDATE_SECONDS = 2592000; // 30 days
export const revalidate = 2592000;

// Last-known-good snapshot for graceful degradation when upstream is flaky.
let lastKnownGoodPhotos: DriverPhoto[] = [];

const getCachedDriverPhotos = unstable_cache(
  async () => {
    const drivers = await getDriversForSession("latest");
    return drivers.map((d) => ({
      driver_number: d.driver_number,
      name_acronym: d.name_acronym,
      last_name: d.last_name,
      headshot_url: d.headshot_url ?? null,
    }));
  },
  ["driver-photos-v3-monthly"],
  { revalidate: DRIVER_PHOTOS_REVALIDATE_SECONDS, tags: ["driver-photos"] }
);

export function _resetDriverPhotosState(): void {
  lastKnownGoodPhotos = [];
}

export async function GET(req: Request) {
  const blocked = rateLimited(req, "driver-photos");
  if (blocked) return blocked;

  try {
    const photos = await getCachedDriverPhotos();

    if (photos.length > 0) {
      lastKnownGoodPhotos = photos;
      return NextResponse.json({ photos });
    }

    if (lastKnownGoodPhotos.length > 0) {
      return NextResponse.json({ photos: lastKnownGoodPhotos });
    }

    return NextResponse.json({ photos });
  } catch (err) {
    // Intentional graceful degradation: photos are decorative — when the OpenF1
    // call fails we still want pages to render, falling back to team logos.
    // Prefer the last-known-good snapshot when available; otherwise empty.
    logRouteError("driver-photos", err);
    if (lastKnownGoodPhotos.length > 0) {
      return NextResponse.json({ photos: lastKnownGoodPhotos });
    }
    return NextResponse.json({ photos: [] });
  }
}
