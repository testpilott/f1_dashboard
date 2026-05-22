import { getPitStops } from "@/lib/api/openf1";
import { handleSessionKeyedEndpoint } from "../_shared";

// Pit stops are live-telemetry; event-driven.
export const revalidate = 30;

export async function GET(req: Request) {
  return handleSessionKeyedEndpoint({
    req,
    routeKey: "sessions-pit",
    allowLatest: false,
    fetcher: (key) => getPitStops(key as number),
    responseKey: "pit",
  });
}
