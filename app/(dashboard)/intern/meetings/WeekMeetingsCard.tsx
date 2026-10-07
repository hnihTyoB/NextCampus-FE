"use client";

import { useMemo } from "react";
import { Calendar, MapPin, Video } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import MetalCard from "@/components/ui/MetalCard";
import Spinner from "@/components/ui/Spinner";
import { useAuth } from "@/hooks/auth/useAuth";
import { useMeetings } from "@/hooks/meeting/useMeetings";
import type { Meeting } from "@/types/meeting";
import { isUserParticipating } from "@/lib/meeting";

const STATUS: Record<string, { dot: string; badge: string }> = {
  SCHEDULED: { dot: "bg-sky-400", badge: "bg-sky-500/15 text-sky-300 border border-sky-500/30" },
  ONGOING: { dot: "bg-emerald-400 animate-pulse", badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" },
  COMPLETED: { dot: "bg-violet-400", badge: "bg-violet-500/15 text-violet-300 border border-violet-500/30" },
  CANCELLED: { dot: "bg-rose-400", badge: "bg-rose-500/15 text-rose-300 border border-rose-500/30" },
  DRAFT: { dot: "bg-slate-400", badge: "bg-slate-500/15 text-slate-300 border border-slate-500/30" },
};

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

export default function WeekMeetingsCard({
  onMeetingClick,
}: {
  onMeetingClick?: (id: string) => void;
}) {
  const t = useTranslations("intern.meetings");
  const locale = useLocale();
  const isVi = locale === "vi";
  const { state } = useAuth();
  const currentUser = state.user;

  const DAY_NAMES = [
    isVi ? "Thứ 2" : "Mon",
    isVi ? "Thứ 3" : "Tue",
    isVi ? "Thứ 4" : "Wed",
    isVi ? "Thứ 5" : "Thu",
    isVi ? "Thứ 6" : "Fri",
    isVi ? "Thứ 7" : "Sat",
    isVi ? "Chủ nhật" : "Sun",
  ];

  const { monday, sunday } = useMemo(() => getWeekRange(), []);

  const { data: meetingsData, isPending } = useMeetings({
    startTimeFrom: monday.toISOString(),
    startTimeTo: sunday.toISOString(),
    startDate: monday.toISOString(),
    endDate: sunday.toISOString(),
    sortBy: "startTime",
    order: "asc",
    limit: 50,
  });

  const meetings = useMemo(() => {
    const list = meetingsData?.data ?? [];
    const currentUserId = currentUser?.id;
    return list.filter((m) => {
      const d = new Date(m.startTime);
      const inThisWeek = d >= monday && d <= sunday;
      const isParticipating = !currentUserId || isUserParticipating(m, currentUserId);
      return inThisWeek && isParticipating;
    });
  }, [meetingsData?.data, currentUser?.id, monday, sunday]);

  const grouped = useMemo(() => {
    const map = new Map<number, Meeting[]>();
    for (let i = 0; i < 7; i++) map.set(i, []);
    for (const m of meetings) {
      const d = new Date(m.startTime);
      if (d < monday || d > sunday) continue;
      const dayIndex = d.getDay() === 0 ? 6 : d.getDay() - 1;
      map.get(dayIndex)?.push(m);
    }
    return map;
  }, [meetings, monday, sunday]);

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(isVi ? "vi-VN" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const STATUS_LABEL: Record<string, string> = {
    SCHEDULED: t("scheduled"),
    ONGOING: t("ongoing"),
    COMPLETED: t("completed"),
    CANCELLED: t("cancelled"),
    DRAFT: t("draft"),
  };

  return (
    <MetalCard>
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-cyan-400" />
            <h3 className="text-base font-semibold metal-text">{t("thisWeek")}</h3>
          </div>
          {meetings.length > 0 && (
            <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-xs font-semibold text-cyan-300">
              {meetings.length}
            </span>
          )}
        </div>

        {isPending ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <Calendar className="mb-2 h-7 w-7 text-muted/40" />
            <p className="text-sm text-muted">{t("noMeetingsThisWeek")}</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {Array.from(grouped.entries()).map(([dayIndex, dayMeetings]) => {
              const date = new Date(monday);
              date.setDate(monday.getDate() + dayIndex);

              return (
                <div key={dayIndex} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-cyan-400">
                      {DAY_NAMES[dayIndex]}
                    </span>
                    <span className="text-xs text-muted">
                      {date.getDate()} {locale === "vi" ? `Tháng ${date.getMonth() + 1}` : date.toLocaleString("en-US", { month: "short" })}
                    </span>
                  </div>

                  {dayMeetings.length === 0 ? (
                    <p className="pl-2 text-xs text-muted/60">{t("noMeetings")}</p>
                  ) : (
                    <div className="space-y-1.5">
                      {dayMeetings.map((m) => {
                        const status = STATUS[m.status] || STATUS.DRAFT;
                        const myParticipant = m.participants?.find(
                          (p) => p.userId === state.user?.id,
                        );
                        const rsvpBadge = myParticipant
                          ? myParticipant.invitationStatus === "ACCEPTED"
                            ? {
                                text: t("accepted"),
                                cls: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
                              }
                            : myParticipant.invitationStatus === "DECLINED"
                            ? {
                                text: t("declined"),
                                cls: "bg-rose-500/15 border-rose-500/30 text-rose-300",
                              }
                            : {
                                text: t("pending"),
                                cls: "bg-amber-500/15 border-amber-500/30 text-amber-300",
                              }
                          : null;

                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => onMeetingClick?.(m.id)}
                            className="group w-full rounded-xl border border-border/60 dark:border-white/5 bg-card/40 dark:bg-white/[0.03] px-3.5 py-2.5 text-left transition-all hover:border-cyan-400/40 hover:bg-card/70 active:scale-[0.99] shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`h-2 w-2 rounded-full shrink-0 ${status.dot}`} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="truncate text-sm font-medium text-foreground group-hover:text-cyan-300 transition-colors">
                                    {m.title}
                                  </p>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {rsvpBadge && (
                                      <span
                                        className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${rsvpBadge.cls}`}
                                      >
                                        {rsvpBadge.text}
                                      </span>
                                    )}
                                    <span
                                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${status.badge}`}
                                    >
                                      {STATUS_LABEL[m.status] || m.status}
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                                  <span className="shrink-0 font-medium text-foreground/80">
                                    {formatTime(m.startTime)} — {formatTime(m.endTime)}
                                  </span>
                                  <span>•</span>
                                  <span className="truncate">
                                    {m.host?.fullName || m.host?.email}
                                  </span>
                                  {m.meetingType === "ONLINE" && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center gap-0.5 text-cyan-400">
                                        <Video className="h-3 w-3" />
                                        {t("online")}
                                      </span>
                                    </>
                                  )}
                                  {m.location && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center gap-0.5 truncate text-muted">
                                        <MapPin className="h-3 w-3" />
                                        {m.location}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MetalCard>
  );
}
