"use client";

import { Calendar, Clock } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import MetalCard from "@/components/ui/MetalCard";
import Spinner from "@/components/ui/Spinner";
import { useMeetings } from "@/hooks/meeting/useMeetings";
import { useAuth } from "@/hooks/auth/useAuth";
import { isUserParticipating } from "@/lib/meeting";

const STATUS: Record<string, { dot: string; badge: string }> = {
  SCHEDULED: { dot: "bg-sky-400", badge: "bg-sky-500/15 text-sky-300 border border-sky-500/30" },
  ONGOING: { dot: "bg-emerald-400 animate-pulse", badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" },
};

export default function UpcomingMeetingsCard({
  onMeetingClick,
}: {
  onMeetingClick?: (id: string) => void;
}) {
  const t = useTranslations("intern.meetings");
  const locale = useLocale();
  const { state } = useAuth();
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const end = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59,
  ).toISOString();

  const endOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59,
    999,
  );

  const { data, isPending } = useMeetings({
    startTimeFrom: start,
    startTimeTo: end,
    startDate: start,
    endDate: end,
    sortBy: "startTime",
    order: "asc",
    limit: 10,
  });
  const now = new Date();
  const meetings = (data?.data ?? []).filter(
    (m) =>
      new Date(m.endTime) > now &&
      new Date(m.startTime) <= endOfDay &&
      (m.status === "SCHEDULED" || m.status === "ONGOING") &&
      isUserParticipating(m, state.user?.id),
  );

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(locale === "vi" ? "vi-VN" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
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
            <Clock className="h-4 w-4 shrink-0 text-cyan-400" />
            <h3 className="text-base font-semibold metal-text">
              {t("upcomingOngoing")}
            </h3>
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
            <p className="text-sm text-muted">{t("noMeetingsToday")}</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {meetings.map((m) => {
              const status = STATUS[m.status] || {
                dot: "bg-slate-400",
                badge: "bg-slate-500/10 text-slate-300 border border-slate-500/20",
              };
              const myParticipant = m.participants?.find((p) => p.userId === state.user?.id);
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
                  className="group w-full rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] p-3 text-left transition-all hover:border-cyan-500/30 shadow-sm cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${status.dot}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs sm:text-sm font-semibold text-foreground group-hover:text-cyan-300 transition-colors">
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
                          {formatTime(m.startTime)}
                        </span>
                        <span>•</span>
                        <span className="shrink-0">{formatDate(m.startTime)}</span>
                        <span>•</span>
                        <span className="truncate">
                          {m.host?.fullName || m.host?.email}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </MetalCard>
  );
}
