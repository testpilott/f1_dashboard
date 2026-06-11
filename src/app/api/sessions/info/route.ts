import { getSessions } from "@/lib/api/openf1";
import { badRequest, serverError, cachedJson } from "@/lib/api/routeHelpers";
import { rateLimited } from "@/lib/api/withRateLimit";
import { VALID_YEAR, VALID_MEETING_KEY } from "@/lib/validators";

// Session metadata (start/end, names) is seasonal — static once published.
export const revalidate = 86400;

export async function GET(req: Request) {
  const blocked = rateLimited(req, "sessions-info");
  if (blocked) return blocked;

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const meetingKey = searchParams.get("meeting_key");

  if (year && !VALID_YEAR.test(year)) {
    return badRequest("Invalid year parameter");
  }
  if (meetingKey && !VALID_MEETING_KEY.test(meetingKey)) {
    return badRequest("Invalid meeting_key parameter");
  }

  try {
    const params: Record<string, string | number> = {};
    if (year) params.year = year;
    if (meetingKey) params.meeting_key = meetingKey;
    if (!year && !meetingKey) params.meeting_key = "latest";
    const sessions = await getSessions(params);
    return cachedJson({ sessions }, "seasonSchedule");
  } catch (err) {
    return serverError("sessions-info", err);
  }
}
