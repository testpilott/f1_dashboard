import { getLaps } from "@/lib/api/openf1";
import { handleSessionKeyedEndpoint } from "../_shared";

// Laps are live-telemetry; tight refresh during a session.
export const revalidate = 30;

export async function GET(req: Request) {
  return handleSessionKeyedEndpoint({
    req,
    routeKey: "sessions-laps",
    allowLatest: false,
    fetcher: (key) => getLaps(key as number),
    responseKey: "laps",
    dataClass: "liveTelemetry",
  });
}
