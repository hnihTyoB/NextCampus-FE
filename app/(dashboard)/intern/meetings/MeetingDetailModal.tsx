"use client";

import { useState } from "react";
import {
  MapPin,
  Video,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  AlertTriangle,
  FileText,
  User,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import Spinner from "@/components/ui/Spinner";
import Button from "@/components/ui/Button";
import { useMeeting } from "@/hooks/meeting/useMeeting";
import { useMeetingAbsences } from "@/hooks/meeting/useMeetingAbsences";
import { useAuth } from "@/hooks/auth/useAuth";
import { useRsvpMeeting } from "@/hooks/meeting/useRsvpMeeting";
import { useSubmitAbsence } from "@/hooks/meeting/useSubmitAbsence";

interface Props {
  meetingId: string;
  onCloseModal?: () => void;
}

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED: "bg-sky-500/20 text-sky-300 border border-sky-500/30",
  ONGOING: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse",
  COMPLETED: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
  CANCELLED: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
  DRAFT: "bg-slate-500/20 text-slate-300 border border-slate-500/30",
};

const INVITATION_ICON: Record<string, { Icon: typeof Clock; color: string }> = {
  ACCEPTED: { Icon: CheckCircle2, color: "text-emerald-400" },
  PENDING: { Icon: Clock, color: "text-amber-400" },
  DECLINED: { Icon: XCircle, color: "text-rose-400" },
};

export default function MeetingDetailModal({ meetingId, onCloseModal }: Props) {
  const t = useTranslations("intern.meetings.detailModal");
  const locale = useLocale();
  const isVi = locale === "vi";
  const { state } = useAuth();
  const currentUser = state.user;

  const { data: meetingData, isPending, isError } = useMeeting(meetingId);
  const { data: absencesData } = useMeetingAbsences(meetingId);
  const rsvpMeeting = useRsvpMeeting();
  const submitAbsence = useSubmitAbsence();

  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(isVi ? "vi-VN" : "en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(isVi ? "vi-VN" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !meetingData) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertTriangle className="h-8 w-8 text-rose-400" />
        <p className="text-sm text-muted">{t("loadError")}</p>
      </div>
    );
  }

  const meeting = meetingData.data;
  const absences = absencesData?.data ?? [];
  const myParticipant = meeting.participants?.find((p) => p.userId === currentUser?.id);
  const myStatus = myParticipant?.invitationStatus;
  const myAbsence = absences.find((a) => a.participant?.userId === currentUser?.id);

  const participantCount = meeting.participants?.filter(
    (p) => p.participantRole === "PARTICIPANT",
  ).length || 0;

  function handleAccept() {
    rsvpMeeting.mutate({ id: meeting.id, payload: { status: "ACCEPTED" } });
  }

  function handleDecline() {
    if (!leaveReason.trim()) return;
    rsvpMeeting.mutate(
      { id: meeting.id, payload: { status: "DECLINED" } },
      {
        onSuccess: () => {
          submitAbsence.mutate({
            meetingId: meeting.id,
            payload: { reason: leaveReason.trim() },
          });
          setShowLeaveForm(false);
          setLeaveReason("");
        },
      },
    );
  }

  const STATUS_LABEL: Record<string, string> = {
    SCHEDULED: t("scheduled"),
    ONGOING: t("ongoing"),
    COMPLETED: t("completed"),
    CANCELLED: t("cancelled"),
    DRAFT: t("draft"),
  };

  const ROLE_LABELS: Record<string, string> = {
    HOST: t("roleHost"),
    ORGANIZER: t("roleOrganizer"),
    PARTICIPANT: t("roleParticipant"),
  };

  return (
    <div className="flex flex-col">
      {/* Sticky Header (Rule 44 Compliant, clears modal close button with pr-9 sm:pr-12) */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-xl pb-3.5 pt-1 -mt-1 border-b border-border dark:border-white/10 pr-9 sm:pr-12">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border border-cyan-300 bg-cyan-100/80 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/15 dark:text-cyan-300 shadow-sm dark:shadow-[0_0_12px_rgba(6,182,212,0.2)]">
              <Calendar className="h-5 w-5 shrink-0" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-bold metal-text truncate">
                {meeting.title}
              </h3>
              <p className="text-xs text-muted mt-0.5 truncate">
                {formatDate(meeting.startTime)}
              </p>
            </div>
          </div>

          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
              STATUS_BADGE[meeting.status] || STATUS_BADGE.DRAFT
            }`}
          >
            {STATUS_LABEL[meeting.status] || meeting.status}
          </span>
        </div>
      </div>

      {/* Main Body */}
      <div className="py-4 space-y-4">
        {/* Description if present */}
        {meeting.description && (
          <div className="rounded-xl border border-white/10 bg-card/40 dark:bg-white/[0.02] p-3 sm:p-4 text-xs sm:text-sm leading-relaxed text-muted">
            {meeting.description}
          </div>
        )}

        {/* Meeting Information Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl sm:rounded-2xl border border-white/10 bg-card/30 dark:bg-white/[0.02] p-3 sm:p-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5 text-foreground/90">
            <Clock className="h-4 w-4 shrink-0 text-cyan-400" />
            <span className="font-medium">
              {formatTime(meeting.startTime)} — {formatTime(meeting.endTime)}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-foreground/90">
            <Users className="h-4 w-4 shrink-0 text-cyan-400" />
            <span>
              {meeting.visibility === "TEAM"
                ? t("allMembers")
                : t("leaders", { n: participantCount, plural: participantCount !== 1 ? "s" : "" })}
            </span>
          </div>

          {meeting.location && (
            <div className="flex items-center gap-2.5 text-foreground/90">
              <MapPin className="h-4 w-4 shrink-0 text-cyan-400" />
              <span className="truncate">{meeting.location}</span>
            </div>
          )}

          {meeting.meetingLink && (
            <div className="flex items-center gap-2.5 col-span-full">
              <Video className="h-4 w-4 shrink-0 text-cyan-400" />
              <a
                href={meeting.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-cyan-400 hover:text-cyan-300 hover:underline transition font-medium"
              >
                {meeting.meetingLink}
              </a>
            </div>
          )}
        </div>

        {/* Host and Creator Meta */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-muted px-1">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-cyan-400" />
            <span>{t("host")}</span>
            <span className="font-semibold text-foreground">
              {meeting.host?.fullName || meeting.host?.email}
            </span>
          </div>
          {meeting.creator && (
            <div className="flex items-center gap-1.5">
              <span>{t("createdBy")}</span>
              <span className="font-medium text-foreground/80">
                {meeting.creator?.fullName || meeting.creator?.email}
              </span>
            </div>
          )}
        </div>

        {/* RSVP & Absence Actions for Participant */}
        {myParticipant && meeting.status !== "COMPLETED" && meeting.status !== "CANCELLED" && (
          <div className="rounded-xl sm:rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-3.5 sm:p-4 space-y-3">
            {showLeaveForm ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-rose-400 shrink-0" />
                  <p className="text-xs sm:text-sm font-semibold text-foreground">
                    {myStatus === "ACCEPTED" ? t("leaveMeeting") : t("declineInvitation")}
                  </p>
                </div>
                <textarea
                  rows={2}
                  placeholder={t("reasonPlaceholder")}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-card/60 dark:bg-white/5 p-3 text-xs sm:text-sm text-foreground placeholder:text-muted/60 outline-none transition focus:border-cyan-400/50 resize-none"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLeaveForm(false);
                      setLeaveReason("");
                    }}
                    className="rounded-lg border border-white/10 bg-card px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-card-hover hover:text-foreground cursor-pointer"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleDecline}
                    disabled={!leaveReason.trim() || rsvpMeeting.isPending || submitAbsence.isPending}
                    className="rounded-lg bg-rose-500/20 border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/30 disabled:opacity-50 cursor-pointer"
                  >
                    {t("confirm")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs sm:text-sm">
                  {myStatus === "ACCEPTED" ? (
                    <span className="font-semibold text-emerald-400">
                      {t("youAccepted")}
                    </span>
                  ) : myStatus === "DECLINED" ? (
                    <span className="font-semibold text-rose-400">
                      {t("youDeclined")}
                    </span>
                  ) : (
                    <span className="font-semibold text-amber-400">
                      {t("youInvited")}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {myStatus !== "ACCEPTED" && (
                    <button
                      type="button"
                      onClick={handleAccept}
                      disabled={rsvpMeeting.isPending}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/30 disabled:opacity-50 cursor-pointer active:scale-95"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{t("accept")}</span>
                    </button>
                  )}
                  {myStatus !== "DECLINED" && (
                    <button
                      type="button"
                      onClick={() => setShowLeaveForm(true)}
                      className="flex items-center gap-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/30 cursor-pointer active:scale-95"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>{myStatus === "ACCEPTED" ? t("leave") : t("decline")}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* If intern already submitted an absence request, display its status */}
            {myAbsence && !showLeaveForm && (
              <div className="mt-2.5 pt-2.5 border-t border-white/10 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted">{t("absenceReason")}</span>
                  <span className="font-medium text-foreground">{myAbsence.reason}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted">{t("absenceStatus")}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${
                      myAbsence.status === "APPROVED"
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                        : myAbsence.status === "REJECTED"
                        ? "bg-rose-500/15 border-rose-500/30 text-rose-300"
                        : "bg-amber-500/15 border-amber-500/30 text-amber-300"
                    }`}
                  >
                    {myAbsence.status === "APPROVED"
                      ? t("statusApproved")
                      : myAbsence.status === "REJECTED"
                      ? t("statusRejected")
                      : t("statusPending")}
                  </span>
                </div>
                {myAbsence.reviewNote && (
                  <div className="flex items-center justify-between gap-2 text-muted/80 italic">
                    <span>{t("reviewNote")}</span>
                    <span>{myAbsence.reviewNote}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Participants List */}
        {meeting.participants && meeting.participants.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              {t("participants")} ({meeting.participants.length})
            </h4>
            <div className="max-h-48 space-y-1 overflow-y-auto overscroll-contain no-scrollbar rounded-xl border border-border/60 dark:border-white/5 bg-card/40 dark:bg-white/[0.02] p-2 sm:p-2.5">
              {meeting.participants.map((p) => {
                const { Icon, color } =
                  INVITATION_ICON[p.invitationStatus] || INVITATION_ICON.PENDING;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs bg-card/40 dark:bg-white/[0.01]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
                      <span className="truncate text-foreground font-medium">
                        {p.user.fullName || p.user.email}
                      </span>
                    </div>
                    <span className="shrink-0 text-[10px] uppercase font-semibold text-muted bg-border/40 dark:bg-white/5 px-2 py-0.5 rounded-full">
                      {ROLE_LABELS[p.participantRole] || p.participantRole}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Action Footer */}
      <div className="sticky bottom-0 z-20 bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-xl pt-3 pb-1 -mb-1 border-t border-border dark:border-white/10 flex items-center justify-end gap-2.5 sm:gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onCloseModal}
        >
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
