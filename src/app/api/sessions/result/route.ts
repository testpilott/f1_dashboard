import { getSessionResult } from "@/lib/api/openf1";
import { handleSessionKeyedEndpoint } from "../_shared";

// Result is liveResults class. Short TTL during a live session, longer once stable.
export const revalidate = 60;

export async function GET(req: Request) {
  return handleSessionKeyedEndpoint({
    req,
    routeKey: "sessions-result",
    allowLatest: true,
    fetcher: (key) => getSessionResult(key),
    responseKey: "results",
    dataClass: "liveResults",
  });
}
