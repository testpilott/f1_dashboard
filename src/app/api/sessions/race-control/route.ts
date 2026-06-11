import { getRaceControl } from "@/lib/api/openf1";
import { handleSessionKeyedEndpoint } from "../_shared";

// Race-control messages are live-incidents; short TTL.
export const revalidate = 30;

export async function GET(req: Request) {
  return handleSessionKeyedEndpoint({
    req,
    routeKey: "sessions-race-control",
    allowLatest: false,
    fetcher: (key) => getRaceControl(key as number),
    responseKey: "raceControl",
    dataClass: "liveIncidents",
  });
}
