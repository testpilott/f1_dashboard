import { getStints } from "@/lib/api/openf1";
import { handleSessionKeyedEndpoint } from "../_shared";

// Stints are live-telemetry; update as new stints start.
export const revalidate = 30;

export async function GET(req: Request) {
  return handleSessionKeyedEndpoint({
    req,
    routeKey: "sessions-stints",
    allowLatest: false,
    fetcher: (key) => getStints(key as number),
    responseKey: "stints",
    dataClass: "liveTelemetry",
  });
}
