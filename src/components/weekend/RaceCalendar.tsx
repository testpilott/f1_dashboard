"use client";

import { useState, useEffect, useRef } from "react";
import {
  addMonths,
  subMonths,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  startOfDay,
  endOfDay,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { OpenF1Meeting } from "@/lib/types";
import { getFlag } from "@/lib/constants";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export default function RaceCalendar({
  meetings,
  activeMeetingKey,
  onSelect,
}: {
  meetings: OpenF1Meeting[];
  activeMeetingKey: number | null;
  onSelect: (meetingKey: number) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const active = meetings.find((m) => m.meeting_key === activeMeetingKey);
    return active ? startOfMonth(parseISO(active.date_start)) : startOfMonth(new Date());
  });

  const prevActiveRef = useRef(activeMeetingKey);
  useEffect(() => {
    if (activeMeetingKey !== prevActiveRef.current) {
      prevActiveRef.current = activeMeetingKey;
      const active = meetings.find((m) => m.meeting_key === activeMeetingKey);
      if (active) setCurrentMonth(startOfMonth(parseISO(active.date_start)));
    }
  }, [activeMeetingKey, meetings]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  function getMeetingForDay(day: Date): OpenF1Meeting | null {
    return (
      meetings.find((m) => {
        const mStart = startOfDay(parseISO(m.date_start));
        const mEnd = endOfDay(parseISO(m.date_end));
        return isWithinInterval(day, { start: mStart, end: mEnd });
      }) ?? null
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold">{format(currentMonth, "MMMM yyyy")}</span>
        <button
          onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[11px] text-zinc-500 font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day) => {
          const meeting = getMeetingForDay(day);
          const isActive = meeting?.meeting_key === activeMeetingKey;
          const inCurrentMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const isFirstDay = meeting ? isSameDay(day, parseISO(meeting.date_start)) : false;
          const isLastDay = meeting ? isSameDay(day, parseISO(meeting.date_end)) : false;

          const roundClass =
            isFirstDay && isLastDay
              ? "rounded-md"
              : isFirstDay
              ? "rounded-l-md"
              : isLastDay
              ? "rounded-r-md"
              : "";

          const bgClass = isActive
            ? "bg-red-600 text-white"
            : meeting
            ? "bg-red-950/70 text-red-200 hover:bg-red-900/60"
            : "text-zinc-500 hover:bg-zinc-800/30";

          return (
            <div
              key={format(day, "yyyy-MM-dd")}
              onClick={() => meeting && onSelect(meeting.meeting_key)}
              className={[
                "h-12 flex flex-col items-center justify-center gap-0.5 text-xs transition-colors",
                meeting ? "cursor-pointer" : "cursor-default",
                !inCurrentMonth ? "opacity-20" : "",
                roundClass,
                bgClass,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span
                className={[
                  "w-6 h-6 flex items-center justify-center font-mono",
                  today ? "rounded-full ring-1 ring-zinc-300 font-bold" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {format(day, "d")}
              </span>
              {isFirstDay && meeting && (
                <span className="text-[11px] leading-none">
                  {getFlag(meeting.country_name)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
