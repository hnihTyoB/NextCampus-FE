"use client";

import { useMemo } from "react";
import { Calendar, MapPin, Video } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations, useLocale } from "next-intl";
import MetalCard from "@/components/ui/MetalCard";
import Spinner from "@/components/ui/Spinner";
import { useAuth } from "@/hooks/auth/useAuth";
import { useMeetings } from "@/hooks/meeting/useMeetings";
import { internService } from "@/services/intern.service";
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
  const t = useTranslations("leader.meetings");
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

  const { data: internsData } = useQuery({
    queryKey: ["interns", { leaderId: currentUser?.id }],
    queryFn: () => internService.getInterns({ leaderId: currentUser!.id, limit: 100 }),
    enabled: !!currentUser,
    staleTime: 1000 * 60 * 5,
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
  const internUserIds = useMemo(
    () => new Set((internsData?.data ?? []).map((i) => i.userId)),
    [internsData],
  );

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

  function getParticipantLabel(m: Meeting) {
    let interns = 0;
    let leaders = 0;
    for (const p of m.participants) {
      if (p.participantRole !== "PARTICIPANT") continue;
      if (internUserIds.has(p.userId)) interns++;
      else leaders++;
    }
    const parts: string[] = [];
    if (interns > 0) parts.push(t("interns", { n: interns, plural: interns !== 1 ? "s" : "" }));
    if (leaders > 0) parts.push(t("leaders", { n: leaders, plural: leaders !== 1 ? "s" : "" }));
    return parts.length > 0 ? parts.join(", ") : t("noParticipants");
  }

  function getRsvpSummary(m: Meeting) {
    const accepted = m.participants.filter(
      (p) => p.participantRole === "PARTICIPANT" && p.invitationStatus === "ACCEPTED",
    ).length;
    const pending = m.participants.filter(
      (p) => p.participantRole === "PARTICIPANT" && p.invitationStatus === "PENDING",
    ).length;
    const declined = m.participants.filter(
      (p) => p.participantRole === "PARTICIPANT" && p.invitationStatus === "DECLINED",
    ).length;
    if (accepted === 0 && pending === 0 && declined === 0) return null;
    const parts: string[] = [];
    if (accepted > 0) parts.push(t("accepted", { n: accepted }));
    if (pending > 0) parts.push(t("pending", { n: pending }));
    if (declined > 0) parts.push(t("declined", { n: declined }));
    return parts.length > 0 ? parts.join(" • ") : null;
  }

  return (
    <MetalCard>
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-cyan-400" />
            <h3 className="text-base font-semibold metal-text">
              {t("thisWeek")}
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
            <p className="text-sm text-muted">{t("noMeetingsWeek")}</p>
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
                      {t("noMeetings")}
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {dayMeetings.map((m) => {
                        const st = STATUS[m.status] || STATUS.DRAFT;
                        const rsvp = getRsvpSummary(m);
                        const isHosted = m.createdBy === currentUser?.id;

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
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                        isHosted
                                          ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                                          : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                      }`}
                                    >
                                      {isHosted ? t("hosted") : t("invited")}
                                    </span>
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${st.badge}`}
                                    >
                                      {STATUS_LABEL[m.status] || m.status}
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
                                  <span>
                                    {formatTime(m.startTime)} — {formatTime(m.endTime)}
                                  </span>
                                  <span>•</span>
                                  <span>{getParticipantLabel(m)}</span>
                                </div>
                                {(m.location || (m.meetingType === "ONLINE" && m.meetingLink)) && (
                                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted/70">
                                    {m.location && (
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3 shrink-0" />
                                        {m.location}
                                      </span>
                                    )}
                                    {m.location && m.meetingType === "ONLINE" && <span>•</span>}
                                    {m.meetingType === "ONLINE" && (
                                      <span className="flex items-center gap-1">
                                        <Video className="h-3 w-3 shrink-0" />
                                        {t("online")}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {rsvp && (
                                  <p className="mt-1 text-[11px] text-muted/80">{rsvp}</p>
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
