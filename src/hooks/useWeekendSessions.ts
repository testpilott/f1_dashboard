import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/clientFetch";
import type { OpenF1Session } from "@/lib/types";

const SESSION_ORDER = [
  "Practice 1",
  "Practice 2",
  "Practice 3",
  "Sprint Qualifying",
  "Sprint",
  "Qualifying",
  "Race",
];

async function fetchSessionsForMeeting(meetingKey: number): Promise<OpenF1Session[]> {
  const data = await fetchJson<{ sessions?: OpenF1Session[] }>(
    `/api/sessions/info?meeting_key=${meetingKey}`,
  );
  return Array.isArray(data.sessions) ? data.sessions : [];
}

/**
 * Fetches and sorts sessions for a given meeting. Uses server-prefetched
 * initialSessions when the requested meeting is the latest one.
 */
export function useWeekendSessions(
  meetingKey: number | null,
  latestMeetingKey: number | null,
  initialSessions: OpenF1Session[],
): { sorted: OpenF1Session[]; isLoading: boolean } {
  const { data: rawSessions, isLoading } = useQuery({
    queryKey: ["sessions-meeting", meetingKey],
    queryFn: () => fetchSessionsForMeeting(meetingKey!),
    staleTime: 5 * 60 * 1000,
    initialData:
      meetingKey === latestMeetingKey && initialSessions.length > 0
        ? initialSessions
        : undefined,
    enabled: meetingKey !== null,
  });

  const sorted = rawSessions
    ? [...rawSessions].sort(
        (a, b) =>
          SESSION_ORDER.indexOf(a.session_name) - SESSION_ORDER.indexOf(b.session_name),
      )
    : [];

  return { sorted, isLoading };
}
