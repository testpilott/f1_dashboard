import { getDriversForSession } from "@/lib/api/openf1";
import { handleSessionKeyedEndpoint } from "../_shared";

// Drivers per session change rarely once published — daily class.
export const revalidate = 3600;

export async function GET(req: Request) {
  return handleSessionKeyedEndpoint({
    req,
    routeKey: "sessions-drivers",
    allowLatest: true,
    fetcher: (key) => getDriversForSession(key),
    responseKey: "drivers",
  });
}
