"use client";

import { useState } from "react";
import type { OpenF1Meeting, OpenF1SessionResult, OpenF1Driver } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import RaceCalendar from "@/components/weekend/RaceCalendar";
import SessionResults from "@/components/weekend/SessionResults";
import { useWeekendSessions } from "@/hooks/useWeekendSessions";
import { format } from "date-fns";

type WeekendData = {
  sessions: import("@/lib/types").OpenF1Session[];
  resultsBySession: Record<number, OpenF1SessionResult[]>;
  driversBySession: Record<number, OpenF1Driver[]>;
};

export default function WeekendClient({
  initialData,
  allMeetings = [],
}: {
  initialData: WeekendData;
  allMeetings?: OpenF1Meeting[];
}) {
  const latestMeetingKey = initialData.sessions[0]?.meeting_key ?? null;
  const [activeMeetingKey, setActiveMeetingKey] = useState<number | null>(null);

  const effectiveMeetingKey = activeMeetingKey ?? latestMeetingKey;
  const { sorted, isLoading } = useWeekendSessions(
    effectiveMeetingKey,
    latestMeetingKey,
    initialData.sessions,
  );

  const fallbackMeeting = {
    meeting_name: sorted[0]?.country_name ?? "Race Weekend",
    circuit_short_name: sorted[0]?.circuit_short_name ?? "",
    year: sorted[0]?.year ?? new Date().getFullYear(),
  };
  const meeting =
    allMeetings.find((m) => m.meeting_key === effectiveMeetingKey) ?? fallbackMeeting;

  const defaultTab =
    sorted.find((s) => s.session_name === "Race")?.session_key?.toString() ??
    sorted[sorted.length - 1]?.session_key?.toString() ??
    "";

  return (
    <div>
      {allMeetings.length > 0 && (
        <RaceCalendar
          meetings={allMeetings}
          activeMeetingKey={activeMeetingKey ?? latestMeetingKey}
          onSelect={setActiveMeetingKey}
        />
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{meeting.meeting_name}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {meeting.circuit_short_name} · {meeting.year}
        </p>
      </div>

      {isLoading && (
        <div>
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {!isLoading && sorted.length === 0 && (
        <p className="text-muted-foreground">No session data available for this race weekend.</p>
      )}

      {!isLoading && sorted.length > 0 && (
        <Tabs defaultValue={defaultTab} key={activeMeetingKey ?? "latest"}>
          <div className="overflow-x-auto -mx-4 px-4">
            <TabsList className="bg-surface-2 flex-nowrap w-max min-w-full gap-1 mb-4">
              {sorted.map((s) => (
                <TabsTrigger
                  key={s.session_key}
                  value={s.session_key.toString()}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs"
                >
                  {s.session_name}
                  {s.date_start && (
                    <span className="ml-1 text-muted-foreground/50 text-[10px]">
                      {format(new Date(s.date_start), "d MMM")}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {sorted.map((s) => (
            <TabsContent key={s.session_key} value={s.session_key.toString()}>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-semibold">{s.session_name}</h2>
                <Badge variant="outline" className="border-border text-muted-foreground text-xs">
                  {s.session_type}
                </Badge>
              </div>
              <SessionResults
                sessionKey={s.session_key}
                sessionType={s.session_name}
                initialResults={
                  effectiveMeetingKey === latestMeetingKey
                    ? initialData.resultsBySession[s.session_key]
                    : undefined
                }
                initialDrivers={
                  effectiveMeetingKey === latestMeetingKey
                    ? initialData.driversBySession[s.session_key]
                    : undefined
                }
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
