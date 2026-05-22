import { getTrackWeather } from "@/lib/api/openf1";
import { handleSessionKeyedEndpoint } from "../_shared";

// Trackside weather snapshots — short TTL while session is live.
export const revalidate = 60;

export async function GET(req: Request) {
  return handleSessionKeyedEndpoint({
    req,
    routeKey: "sessions-weather",
    allowLatest: false,
    fetcher: (key) => getTrackWeather(key as number),
    responseKey: "weather",
  });
}
