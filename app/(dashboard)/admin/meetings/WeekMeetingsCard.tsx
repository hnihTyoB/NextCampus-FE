"use client";

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Calendar, MapPin } from "lucide-react";
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
  scope = "my",
}: {
  onMeetingClick?: (id: string) => void;
  scope?: "my" | "all";
}) {
  const t = useTranslations();
  const locale = useLocale();
  const isVi = locale === "vi";
  const { state } = useAuth();

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

  const { data, isPending } = useMeetings({
    startTimeFrom: monday.toISOString(),
    startTimeTo: sunday.toISOString(),
    startDate: monday.toISOString(),
    endDate: sunday.toISOString(),
    sortBy: "startTime",
    order: "asc",
    limit: 50,
  });

  const meetings = useMemo(() => {
    const list = data?.data ?? [];
    const userId = state.user?.id;
    return list.filter((m) => {
      const d = new Date(m.startTime);
      const inThisWeek = d >= monday && d <= sunday;
      const isParticipating = scope === "all" || (userId ? isUserParticipating(m, userId) : false);
      return inThisWeek && isParticipating;
    });
  }, [data?.data, scope, state.user?.id, monday, sunday]);

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
    SCHEDULED: t("admin.meetings.scheduled"),
    ONGOING: t("admin.meetings.ongoing"),
    COMPLETED: t("admin.meetings.completed"),
    CANCELLED: t("admin.meetings.cancelled"),
    DRAFT: t("admin.meetings.draft"),
  };

  function getParticipantLabel(m: Meeting) {
    if (m.visibility === "TEAM") return t("admin.meetings.allMembers");
    const count =
      m.participants?.filter((p) => p.participantRole === "PARTICIPANT").length ||
      m._count?.participants ||
      0;
    return t("admin.meetings.leaders", { n: count, plural: count > 1 ? "s" : "" });
  }

  return (
    <MetalCard>
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-cyan-400" />
            <h3 className="text-base font-semibold metal-text">
              {t("admin.meetings.thisWeek")}
            </h3>
          </div>
          {meetings.length > 0 && (
            <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-xs font-semibold text-cyan-300">
              {meetings.length}
            </span>
          )}
        </div>

        {isPending ? (
          <div className="flex items-center justify-center py-10">
            <Spinner size="md" />
          </div>
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Calendar className="mb-2 h-7 w-7 text-muted/40" />
            <p className="text-sm text-muted">{t("admin.meetings.noMeetingsWeek")}</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {Array.from(grouped.entries()).map(([dayIndex, dayMeetings]) => {
              const date = new Date(monday);
              date.setDate(monday.getDate() + dayIndex);

              return (
                <div key={dayIndex}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                      {DAY_NAMES[dayIndex]} — {date.getDate()}
                    </span>
                  </div>

                  {dayMeetings.length === 0 ? (
                    <p className="pl-1 text-xs text-muted/60">
                      {t("admin.meetings.noMeetings")}
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {dayMeetings.map((m) => {
                        const st = STATUS[m.status] || STATUS.DRAFT;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => onMeetingClick?.(m.id)}
                            className="group w-full rounded-xl border border-border/60 dark:border-white/5 bg-card/40 dark:bg-white/[0.03] px-3.5 py-2.5 text-left transition-all hover:border-cyan-400/40 hover:bg-card/70 active:scale-[0.99] shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${st.dot}`} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="truncate text-sm font-medium text-foreground group-hover:text-cyan-300 transition-colors">
                                    {m.title}
                                  </p>
                                  <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.badge}`}
                                  >
                                    {STATUS_LABEL[m.status] || m.status}
                                  </span>
                                </div>
                                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
                                  <span>
                                    {formatTime(m.startTime)} — {formatTime(m.endTime)}
                                  </span>
                                  <span>•</span>
                                  <span>{getParticipantLabel(m)}</span>
                                </div>
                                {(m.location || m.host) && (
                                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted/70">
                                    {m.location && (
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3 shrink-0" />
                                        {m.location}
                                      </span>
                                    )}
                                    {m.location && m.host && <span>•</span>}
                                    {m.host && (
                                      <span className="truncate">
                                        {t("admin.meetings.host")}{" "}
                                        {m.host.fullName || m.host.email}
                                      </span>
                                    )}
                                  </div>
                                )}
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
