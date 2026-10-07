"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, AlertTriangle, Calendar as CalendarIcon } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import MetalCard from "@/components/ui/MetalCard";
import Spinner from "@/components/ui/Spinner";
import { useMeetings } from "@/hooks/meeting/useMeetings";
import { useMyApprovedAbsences } from "@/hooks/meeting/useMyApprovedAbsences";
import MeetingCalendarDay from "./MeetingCalendarDay";
import type { Meeting } from "@/types/meeting";
import { isUserParticipating } from "@/lib/meeting";

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export default function MeetingCalendar({
  onMeetingClick,
  currentUserId,
}: {
  onMeetingClick: (id: string) => void;
  currentUserId?: string;
}) {
  const t = useTranslations("intern.meetings");
  const locale = useLocale();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const { data: excusedIds } = useMyApprovedAbsences();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const startTimeFrom = new Date(year, month, 1).toISOString();
  const startTimeTo = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  const { data, isPending, isError } = useMeetings({
    startTimeFrom,
    startTimeTo,
    startDate: startTimeFrom,
    endDate: startTimeTo,
    limit: 100,
    sortBy: "startTime",
    order: "asc",
  });

  const meetings = useMemo(() => {
    const list = data?.data ?? [];
    if (!currentUserId) return list;
    return list.filter((m) => isUserParticipating(m, currentUserId));
  }, [data?.data, currentUserId]);

  const meetingsByDay = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const m of meetings) {
      const key = new Date(m.startTime).toDateString();
      const list = map.get(key) || [];
      list.push(m);
      map.set(key, list);
    }
    return map;
  }, [meetings]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    setCurrentMonth(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentMonth(new Date(year, month + 1, 1));
  }

  function isPast(d: Date) {
    const tDate = new Date();
    tDate.setHours(0, 0, 0, 0);
    return d < tDate;
  }

  // Localized Month & Year header
  const formattedMonthYear = useMemo(() => {
    const str = currentMonth.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
      month: "long",
      year: "numeric",
    });
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, [currentMonth, locale]);

  // Clean 7-day abbreviations
  const dayNames = useMemo(() => {
    if (locale === "vi") {
      return ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    }
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  }, [locale]);

  const legend = [
    { color: "bg-amber-400", label: t("invited") },
    { color: "bg-emerald-400", label: t("ongoing") },
    { color: "bg-violet-400", label: t("completed") },
    { color: "bg-rose-400", label: t("cancelled") },
  ];

  return (
    <MetalCard>
      <div className="p-4 sm:p-6">
        {/* Navigation and Title */}
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-xl border border-border/70 dark:border-white/10 bg-card/60 dark:bg-white/[0.03] p-1">
              <button
                type="button"
                onClick={prevMonth}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-card hover:text-foreground active:scale-95 cursor-pointer"
                aria-label={t("previousMonth")}
              >
                <ChevronLeft className="h-4 w-4 shrink-0" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-card hover:text-foreground active:scale-95 cursor-pointer"
                aria-label={t("nextMonth")}
              >
                <ChevronRight className="h-4 w-4 shrink-0" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 shrink-0 text-cyan-400" />
              <h3 className="text-lg sm:text-xl font-bold metal-text">
                {formattedMonthYear}
              </h3>
            </div>
          </div>

          {/* Legend badges */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-[11px] text-muted">
            {legend.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full shrink-0 ${item.color}`} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {isError ? (
          <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
            <p className="text-sm text-red-300">{t("calendarError")}</p>
          </div>
        ) : isPending ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* Day headers */}
            <div className="mb-2 grid grid-cols-7 gap-1">
              {dayNames.map((name) => (
                <div
                  key={name}
                  className="py-1.5 text-center text-xs font-semibold tracking-wider text-muted uppercase"
                >
                  {name}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {cells.map((date, i) => {
                const key = date ? date.toDateString() : "";
                const dayMeetings = key ? meetingsByDay.get(key) || [] : [];
                return (
                  <MeetingCalendarDay
                    key={i}
                    date={date}
                    meetings={dayMeetings}
                    isToday={date ? isSameDay(date, today) : false}
                    isCurrentMonth={date ? date.getMonth() === month : false}
                    isPast={date ? isPast(date) : false}
                    currentUserId={currentUserId}
                    excusedMeetingIds={excusedIds}
                    onClickMeeting={(meetingId) => onMeetingClick(meetingId)}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </MetalCard>
  );
}
