import WeekendClient from "@/components/weekend/WeekendClient";
import { getDriversForSession, getSessionResult, getSessions, getMeetings } from "@/lib/api/openf1";
import type { OpenF1Driver, OpenF1Meeting, OpenF1Session, OpenF1SessionResult } from "@/lib/types";

export default async function WeekendPage() {
  const [sessions, allMeetings] = await Promise.all([
    getSessions({ meeting_key: "latest" }),
    getMeetings(new Date().getFullYear()).catch(() => [] as OpenF1Meeting[]),
  ]);

  const resultEntries = await Promise.allSettled(
    sessions.map(async (session) => [session.session_key, await getSessionResult(session.session_key)] as const)
  );
  const driverEntries = await Promise.allSettled(
    sessions.map(async (session) => [session.session_key, await getDriversForSession(session.session_key)] as const)
  );

  const resultsBySession: Record<number, OpenF1SessionResult[]> = {};
  const driversBySession: Record<number, OpenF1Driver[]> = {};

  resultEntries.forEach((entry) => {
    if (entry.status === "fulfilled") {
      const [sessionKey, results] = entry.value;
      resultsBySession[sessionKey] = results;
    }
  });
  driverEntries.forEach((entry) => {
    if (entry.status === "fulfilled") {
      const [sessionKey, drivers] = entry.value;
      driversBySession[sessionKey] = drivers;
    }
  });

  // Sort meetings by date ascending so the selector is chronological
  const sortedMeetings = [...allMeetings].sort(
    (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
  );

  return (
    <WeekendClient
      initialData={{
        sessions: sessions as OpenF1Session[],
        resultsBySession,
        driversBySession,
      }}
      allMeetings={sortedMeetings}
    />
  );
}
