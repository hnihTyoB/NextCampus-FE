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
  Loader2,
  Check,
  X,
  ExternalLink,
  Headphones,
  ShieldCheck,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import Spinner from "@/components/ui/Spinner";
import Button from "@/components/ui/Button";
import { useMeeting } from "@/hooks/meeting/useMeeting";
import { useMeetingAbsences } from "@/hooks/meeting/useMeetingAbsences";
import { useUpdateMeeting } from "@/hooks/meeting/useUpdateMeeting";
import { useReviewAbsence } from "@/hooks/meeting/useReviewAbsence";
import { useAuth } from "@/hooks/auth/useAuth";
import { useRsvpMeeting } from "@/hooks/meeting/useRsvpMeeting";
import { useSubmitAbsence } from "@/hooks/meeting/useSubmitAbsence";
import { useGrantDiscordPermissions } from "@/hooks/meeting/useGrantDiscordPermissions";
import { useResetDiscordPermissions } from "@/hooks/meeting/useResetDiscordPermissions";
import { useRBAC } from "@/hooks/rbac/useRBAC";

interface Props {
  meetingId: string;
  onCloseModal?: () => void;
}

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
  ONGOING: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  COMPLETED: "bg-violet-500/15 text-violet-300 border border-violet-500/30",
  CANCELLED: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
  DRAFT: "bg-slate-500/15 text-slate-300 border border-slate-500/30",
};

const INVITATION_ICON: Record<string, { Icon: typeof Clock; color: string }> = {
  ACCEPTED: { Icon: CheckCircle2, color: "text-emerald-400" },
  PENDING: { Icon: Clock, color: "text-amber-400" },
  DECLINED: { Icon: XCircle, color: "text-rose-400" },
};

export default function MeetingDetailModal({ meetingId, onCloseModal }: Props) {
  const t = useTranslations("leader.meetings");
  const locale = useLocale();
  const isVi = locale === "vi";
  const { state } = useAuth();
  const currentUser = state.user;
  const { can } = useRBAC();
  const canAttend = can("MEETING_ATTEND");
  const canSubmitAbsence = can("MEETING_ABSENCE_SUBMIT");
  const canReviewAbsence = can("MEETING_ABSENCE_REVIEW");
  const canUpdateMeeting = can("MEETING_UPDATE");

  const { data: meetingData, isPending, isError } = useMeeting(meetingId);
  const { data: absencesData } = useMeetingAbsences(meetingId);
  const updateMeeting = useUpdateMeeting();
  const reviewAbsence = useReviewAbsence();
  const rsvpMeeting = useRsvpMeeting();
  const submitAbsence = useSubmitAbsence();
  const grantDiscord = useGrantDiscordPermissions();
  const resetDiscord = useResetDiscordPermissions();

  const [confirmAction, setConfirmAction] = useState<"cancel" | null>(null);
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
        <p className="text-sm text-muted">{t("loadDetailError")}</p>
      </div>
    );
  }

  const meeting = meetingData.data;
  const absences = absencesData?.data ?? [];
  const myParticipant = meeting.participants?.find((p) => p.userId === currentUser?.id);
  const myStatus = myParticipant?.invitationStatus;
  const isHostOrOrganizer =
    meeting.createdBy === currentUser?.id ||
    meeting.hostId === currentUser?.id ||
    myParticipant?.participantRole === "HOST" ||
    myParticipant?.participantRole === "ORGANIZER";

  const participantCount = meeting.participants?.filter(
    (p) => p.participantRole === "PARTICIPANT",
  ).length || 0;

  function handleCancel() {
    updateMeeting.mutate(
      { id: meeting.id, payload: { status: "CANCELLED" } },
      { onSuccess: () => onCloseModal?.() },
    );
  }

  function handleReview(absenceId: string, status: "APPROVED" | "REJECTED") {
    reviewAbsence.mutate({ absenceId, payload: { status } });
  }

  function handleAccept() {
    rsvpMeeting.mutate({ id: meeting.id, payload: { status: "ACCEPTED" } });
  }

  function handleDecline() {
    if (!leaveReason.trim()) return;
    rsvpMeeting.mutate({ id: meeting.id, payload: { status: "DECLINED" } });
    submitAbsence.mutate({ meetingId: meeting.id, payload: { reason: leaveReason } });
    setShowLeaveForm(false);
    setLeaveReason("");
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

  const ABSENCE_STATUS_LABEL: Record<string, string> = {
    PENDING: t("statusPending"),
    APPROVED: t("statusApproved"),
    REJECTED: t("statusRejected"),
  };

  return (
    <div className="space-y-6 px-0.5 sm:px-1 py-1">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-border/60 dark:border-white/10 pb-4 pr-8">
        <div>
          <h3 className="text-xl font-bold text-foreground">
            {meeting.title}
          </h3>
          {meeting.description && (
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {meeting.description}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            STATUS_BADGE[meeting.status] || STATUS_BADGE.DRAFT
          }`}
        >
          {STATUS_LABEL[meeting.status] || meeting.status}
        </span>
      </div>

      {/* Info Card */}
      <div className="space-y-3 rounded-2xl border border-border/70 dark:border-white/10 bg-card/60 dark:bg-white/[0.02] p-4 sm:p-5">
        <div className="flex items-center gap-3 text-sm text-foreground">
          <Calendar className="h-4 w-4 shrink-0 text-cyan-400" />
          <span>{formatDate(meeting.startTime)}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-foreground">
          <Clock className="h-4 w-4 shrink-0 text-cyan-400" />
          <span>
            {formatTime(meeting.startTime)} — {formatTime(meeting.endTime)}
          </span>
        </div>
        {meeting.location && (
          <div className="flex items-center gap-3 text-sm text-foreground">
            <MapPin className="h-4 w-4 shrink-0 text-cyan-400" />
            <span>{meeting.location}</span>
          </div>
        )}
        {meeting.meetingLink && (
          <div className="flex items-center gap-3 text-sm text-foreground">
            <Video className="h-4 w-4 shrink-0 text-cyan-400" />
            <a
              href={meeting.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 hover:underline truncate"
            >
              <span>{meeting.meetingLink}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          </div>
        )}
        {meeting.discordVoiceLink && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm text-foreground pt-0.5">
            <div className="flex items-center gap-3 min-w-0">
              <Headphones className="h-4 w-4 shrink-0 text-indigo-400" />
              <a
                href={meeting.discordVoiceLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 hover:underline font-medium truncate"
              >
                <span>{t("joinDiscordVoice")}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold self-start sm:self-auto ${
                meeting.discordPermissionsResetAt
                  ? "bg-slate-500/15 text-slate-300 border border-slate-500/30"
                  : meeting.discordPermissionsGranted
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
              }`}
            >
              {meeting.discordPermissionsResetAt
                ? t("discordRoomStatusReset")
                : meeting.discordPermissionsGranted
                  ? t("discordRoomStatusGranted")
                  : t("discordRoomStatusPending")}
            </span>
          </div>
        )}
        <div className="flex items-center gap-3 text-sm text-foreground">
          <Users className="h-4 w-4 shrink-0 text-cyan-400" />
          <span>
            {meeting.visibility === "TEAM"
              ? t("allMembers")
              : t("leaders", { n: participantCount })}
          </span>
        </div>
      </div>

      {/* RSVP Section (For invited participants) */}
      {!isHostOrOrganizer && myParticipant && meeting.status !== "COMPLETED" && meeting.status !== "CANCELLED" && (
        <div className="rounded-2xl border border-border/70 dark:border-white/10 bg-card/60 dark:bg-white/[0.02] p-4 sm:p-5">
          {showLeaveForm ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">
                {myStatus === "ACCEPTED" ? t("leaveMeeting") : t("declineInvitation")}
              </p>
              <textarea
                rows={2}
                placeholder={t("reasonPlaceholder")}
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="w-full rounded-xl border border-border/70 dark:border-white/10 bg-card dark:bg-white/5 px-4 py-2 text-sm text-foreground placeholder:text-muted outline-none focus:border-cyan-400/50 resize-none"
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setShowLeaveForm(false);
                    setLeaveReason("");
                  }}
                >
                  {t("cancel")}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  type="button"
                  onClick={handleDecline}
                  disabled={!leaveReason.trim() || rsvpMeeting.isPending || submitAbsence.isPending}
                >
                  {t("confirm")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm text-muted">
                {myStatus === "ACCEPTED"
                  ? t("youAccepted")
                  : myStatus === "DECLINED"
                  ? t("youDeclined")
                  : t("youInvited")}
              </p>
              {(canAttend || canSubmitAbsence) && (
                <div className="flex items-center gap-2">
                  {canAttend && myStatus !== "ACCEPTED" && (
                    <button
                      type="button"
                      onClick={handleAccept}
                      disabled={rsvpMeeting.isPending}
                      className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25 active:scale-95 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span>{t("accept")}</span>
                    </button>
                  )}
                  {canSubmitAbsence && myStatus !== "DECLINED" && (
                    <button
                      type="button"
                      onClick={() => setShowLeaveForm(true)}
                      className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/15 px-3.5 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/25 active:scale-95"
                    >
                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{myStatus === "ACCEPTED" ? t("leave") : t("decline")}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Host & Creator info */}
      <div className="flex flex-wrap gap-x-8 gap-y-2 text-xs text-muted border-t border-b border-border/60 dark:border-white/10 py-3">
        <span>
          {t("host")}{" "}
          <strong className="text-foreground font-medium">
            {meeting.host.fullName || meeting.host.email}
          </strong>
        </span>
        <span>
          {t("createdBy")}{" "}
          <strong className="text-foreground font-medium">
            {meeting.creator.fullName || meeting.creator.email}
          </strong>
        </span>
      </div>

      {/* Participants List */}
      {meeting.participants && meeting.participants.length > 0 && (
        <div>
          <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted">
            {t("participants")} ({meeting.participants.length})
          </h4>
          <div className="max-h-48 space-y-1 overflow-y-auto overscroll-contain no-scrollbar rounded-xl border border-border/60 dark:border-white/5 bg-card/40 dark:bg-white/[0.02] p-2 sm:p-2.5">
            {meeting.participants.map((p) => {
              const { Icon, color } = INVITATION_ICON[p.invitationStatus] || INVITATION_ICON.PENDING;
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

      {/* Absence Requests (For Host / Creator) */}
      {isHostOrOrganizer && absences.length > 0 && (
        <div>
          <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted">
            {t("absenceRequests")} ({absences.length})
          </h4>
          <div className="space-y-2">
            {absences.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border border-border/60 dark:border-white/5 bg-card/40 dark:bg-white/[0.02] p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {a.participant.user.fullName || a.participant.user.email}
                    </p>
                    <p className="mt-1 text-xs text-muted leading-relaxed">{a.reason}</p>
                    {a.reviewNote && (
                      <p className="mt-1 text-xs italic text-muted">
                        {t("note")} {a.reviewNote}
                      </p>
                    )}
                  </div>
                  {a.status === "PENDING" ? (
                    canReviewAbsence ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleReview(a.id, "APPROVED")}
                          disabled={reviewAbsence.isPending}
                          className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/25 active:scale-95"
                        >
                          <Check className="h-3 w-3 shrink-0" />
                          <span>{t("approve")}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReview(a.id, "REJECTED")}
                          disabled={reviewAbsence.isPending}
                          className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/15 px-3 py-1 text-xs font-medium text-rose-300 transition hover:bg-rose-500/25 active:scale-95"
                        >
                          <X className="h-3 w-3 shrink-0" />
                          <span>{t("reject")}</span>
                        </button>
                      </div>
                    ) : (
                      <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {ABSENCE_STATUS_LABEL[a.status] || a.status}
                      </span>
                    )
                  ) : (
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                        a.status === "APPROVED"
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {ABSENCE_STATUS_LABEL[a.status] || a.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel Confirmation & Actions */}
      {isHostOrOrganizer && canUpdateMeeting && meeting.status !== "COMPLETED" && meeting.status !== "CANCELLED" && (
        <div className="border-t border-border/60 dark:border-white/10 pt-4">
          {confirmAction === "cancel" ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-300">
                    {t("cancelMeetingTitle")}
                  </p>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    {t("cancelMeetingDesc")}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      type="button"
                      onClick={() => setConfirmAction(null)}
                    >
                      {t("noKeepIt")}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      type="button"
                      onClick={handleCancel}
                      disabled={updateMeeting.isPending}
                    >
                      {t("yesCancelIt")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {meeting.discordChannelId && isHostOrOrganizer && (
                  !meeting.discordPermissionsGranted ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => grantDiscord.mutate(meeting.id)}
                      disabled={grantDiscord.isPending}
                      className="gap-1.5 text-indigo-400 hover:text-indigo-300"
                    >
                      {grantDiscord.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                      ) : (
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span>{t("grantDiscordPermissions")}</span>
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resetDiscord.mutate(meeting.id)}
                      disabled={resetDiscord.isPending}
                      className="gap-1.5 text-amber-400 hover:text-amber-300"
                    >
                      {resetDiscord.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                      ) : (
                        <Headphones className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span>{t("resetDiscordPermissions")}</span>
                    </Button>
                  )
                )}

                <button
                  type="button"
                  onClick={() => setConfirmAction("cancel")}
                  disabled={updateMeeting.isPending}
                  className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition"
                >
                  {updateMeeting.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  <span>{t("cancelMeeting")}</span>
                </button>
              </div>
              <Button size="sm" variant="ghost" type="button" onClick={onCloseModal}>
                {t("cancel")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
