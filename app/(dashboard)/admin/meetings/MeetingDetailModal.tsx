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
  Trash2,
  Check,
  X,
  Headphones,
  ShieldCheck,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import Spinner from "@/components/ui/Spinner";
import Button from "@/components/ui/Button";
import { useMeeting } from "@/hooks/meeting/useMeeting";
import { useMeetingAbsences } from "@/hooks/meeting/useMeetingAbsences";
import { useUpdateMeeting } from "@/hooks/meeting/useUpdateMeeting";
import { useDeleteMeeting } from "@/hooks/meeting/useDeleteMeeting";
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
  const t = useTranslations();
  const locale = useLocale();
  const isVi = locale === "vi";
  const { state } = useAuth();
  const currentUser = state.user;

  const { can } = useRBAC();
  const canAttend = can("MEETING_ATTEND");
  const canSubmitAbsence = can("MEETING_ABSENCE_SUBMIT");
  const canReviewAbsence = can("MEETING_ABSENCE_REVIEW");
  const canUpdateMeeting = can("MEETING_UPDATE");
  const canDeleteMeeting = can("MEETING_DELETE");

  const { data: meetingData, isPending, isError } = useMeeting(meetingId);
  const { data: absencesData } = useMeetingAbsences(meetingId);
  const updateMeeting = useUpdateMeeting();
  const deleteMeeting = useDeleteMeeting();
  const reviewAbsence = useReviewAbsence();
  const rsvpMeeting = useRsvpMeeting();
  const submitAbsence = useSubmitAbsence();
  const grantDiscord = useGrantDiscordPermissions();
  const resetDiscord = useResetDiscordPermissions();

  const [confirmAction, setConfirmAction] = useState<"cancel" | "delete" | null>(null);
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
        <p className="text-sm text-muted">{t("admin.meetings.loadDetailError")}</p>
      </div>
    );
  }

  const meeting = meetingData.data;
  const absences = absencesData?.data ?? [];

  const leaderCount = meeting.participants.filter(
    (p) => p.participantRole === "PARTICIPANT",
  ).length;

  const myParticipant = meeting?.participants.find((p) => p.userId === currentUser?.id);
  const myStatus = myParticipant?.invitationStatus;

  function handleCancel() {
    updateMeeting.mutate(
      { id: meeting.id, payload: { status: "CANCELLED" } },
      { onSuccess: () => onCloseModal?.() },
    );
  }

  function handleDelete() {
    deleteMeeting.mutate(meeting.id, {
      onSuccess: () => onCloseModal?.(),
    });
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
    submitAbsence.mutate({
      meetingId: meeting.id,
      payload: { reason: leaveReason },
    });
    setShowLeaveForm(false);
    setLeaveReason("");
  }

  const STATUS_LABEL: Record<string, string> = {
    SCHEDULED: t("admin.meetings.scheduled"),
    ONGOING: t("admin.meetings.ongoing"),
    COMPLETED: t("admin.meetings.completed"),
    CANCELLED: t("admin.meetings.cancelled"),
    DRAFT: t("admin.meetings.draft"),
  };

  const ROLE_LABELS: Record<string, string> = {
    HOST: t("admin.meetings.roleHost"),
    ORGANIZER: t("admin.meetings.roleOrganizer"),
    PARTICIPANT: t("admin.meetings.roleParticipant"),
  };

  const ABSENCE_STATUS_LABEL: Record<string, string> = {
    PENDING: t("admin.meetings.statusPending"),
    APPROVED: t("admin.meetings.statusApproved"),
    REJECTED: t("admin.meetings.statusRejected"),
  };

  return (
    <div className="space-y-6 px-0.5 sm:px-1 py-1">
      {/* Title + Status */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-bold text-foreground metal-text">{meeting.title}</h3>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
              STATUS_BADGE[meeting.status] || STATUS_BADGE.DRAFT
            }`}
          >
            {STATUS_LABEL[meeting.status] || meeting.status}
          </span>
        </div>
        {meeting.description && (
          <p className="mt-2 text-sm leading-relaxed text-muted">{meeting.description}</p>
        )}
      </div>

      {/* Info rows */}
      <div className="space-y-2.5 rounded-2xl border border-border/70 dark:border-white/5 bg-card/40 dark:bg-white/[0.03] p-4">
        <div className="flex items-center gap-3 text-sm text-foreground/90">
          <Calendar className="h-4 w-4 shrink-0 text-cyan-400" />
          <span>{formatDate(meeting.startTime)}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-foreground/90">
          <Clock className="h-4 w-4 shrink-0 text-cyan-400" />
          <span>
            {formatTime(meeting.startTime)} — {formatTime(meeting.endTime)}
          </span>
        </div>
        {meeting.location && (
          <div className="flex items-center gap-3 text-sm text-foreground/90">
            <MapPin className="h-4 w-4 shrink-0 text-cyan-400" />
            <span>{meeting.location}</span>
          </div>
        )}
        {meeting.meetingLink && (
          <div className="flex items-center gap-3 text-sm text-foreground/90">
            <Video className="h-4 w-4 shrink-0 text-cyan-400" />
            <a
              href={meeting.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-cyan-400 hover:text-cyan-300 hover:underline"
            >
              {meeting.meetingLink}
            </a>
          </div>
        )}
        {meeting.discordVoiceLink && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm text-foreground/90 pt-0.5">
            <div className="flex items-center gap-3 min-w-0">
              <Headphones className="h-4 w-4 shrink-0 text-indigo-400" />
              <a
                href={meeting.discordVoiceLink}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-indigo-400 hover:text-indigo-300 hover:underline font-medium"
              >
                {t("admin.meetings.joinDiscordVoice")}
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
                ? t("admin.meetings.discordRoomStatusReset")
                : meeting.discordPermissionsGranted
                  ? t("admin.meetings.discordRoomStatusGranted")
                  : t("admin.meetings.discordRoomStatusPending")}
            </span>
          </div>
        )}
        <div className="flex items-center gap-3 text-sm text-foreground/90">
          <Users className="h-4 w-4 shrink-0 text-cyan-400" />
          <span>
            {meeting.visibility === "TEAM"
              ? t("admin.meetings.allMembers")
              : t("admin.meetings.leaders", { n: leaderCount, plural: leaderCount !== 1 ? "s" : "" })}
          </span>
        </div>
      </div>

      {/* RSVP Section */}
      {myParticipant && meeting.status !== "COMPLETED" && meeting.status !== "CANCELLED" && (
        <div className="rounded-2xl border border-border/70 dark:border-white/5 bg-card/40 dark:bg-white/[0.03] p-4">
          {showLeaveForm ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">
                {myStatus === "ACCEPTED"
                  ? t("admin.meetings.declineTitle")
                  : t("admin.meetings.declineHint")}
              </p>
              <textarea
                rows={2}
                placeholder={t("admin.meetings.absenceReasonPlaceholder")}
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="w-full rounded-xl border border-border/70 dark:border-white/10 bg-card/60 dark:bg-white/5 px-4 py-2 text-sm text-foreground outline-none transition focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 placeholder:text-muted/60 resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowLeaveForm(false);
                    setLeaveReason("");
                  }}
                  className="rounded-xl border border-border/70 dark:border-white/10 bg-card/40 px-3.5 py-1.5 text-xs text-muted hover:text-foreground transition"
                >
                  {t("admin.meetings.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleDecline}
                  disabled={
                    !leaveReason.trim() || rsvpMeeting.isPending || submitAbsence.isPending
                  }
                  className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-3.5 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/25 active:scale-95 disabled:opacity-50"
                >
                  {t("admin.meetings.confirmAbsence")}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-muted">
                  {t("admin.meetings.yourResponse")}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    myStatus === "ACCEPTED"
                      ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                      : myStatus === "DECLINED"
                      ? "bg-rose-500/15 border border-rose-500/30 text-rose-300"
                      : "bg-amber-500/15 border border-amber-500/30 text-amber-300"
                  }`}
                >
                  {myStatus === "ACCEPTED"
                    ? t("admin.meetings.rsvpStatusAccepted")
                    : myStatus === "DECLINED"
                    ? t("admin.meetings.rsvpStatusDeclined")
                    : t("admin.meetings.rsvpStatusPending")}
                </span>
              </div>
              {(canAttend || canSubmitAbsence) && (
                <div className="flex items-center gap-2">
                  {canAttend && myStatus !== "ACCEPTED" && (
                    <button
                      type="button"
                      onClick={handleAccept}
                      disabled={rsvpMeeting.isPending}
                      className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/25 active:scale-95 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span>{t("admin.meetings.attend")}</span>
                    </button>
                  )}
                  {canSubmitAbsence && myStatus !== "DECLINED" && (
                    <button
                      type="button"
                      onClick={() => setShowLeaveForm(true)}
                      className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/15 px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-500/25 active:scale-95"
                    >
                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{t("admin.meetings.reportAbsence")}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Host + Creator */}
      <div className="flex flex-wrap gap-x-8 gap-y-1 text-xs text-muted border-t border-border/60 dark:border-white/5 pt-3">
        <span>
          {t("admin.meetings.host")}{" "}
          <span className="font-medium text-foreground">
            {meeting.host.fullName || meeting.host.email}
          </span>
        </span>
        <span>
          {t("admin.meetings.createdBy")}{" "}
          <span className="font-medium text-foreground">
            {meeting.creator.fullName || meeting.creator.email}
          </span>
        </span>
      </div>

      {/* Participants */}
      {meeting.participants.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            {t("admin.meetings.participants")}
          </h4>
          <div className="max-h-[180px] space-y-1 overflow-y-auto overscroll-contain no-scrollbar rounded-xl border border-border/60 dark:border-white/5 bg-card/40 dark:bg-white/[0.02] p-2">
            {meeting.participants.map((p) => {
              const { Icon, color } = INVITATION_ICON[p.invitationStatus] || INVITATION_ICON.PENDING;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm hover:bg-card/80 dark:hover:bg-white/5"
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
                  <span className="flex-1 truncate text-foreground font-medium">
                    {p.user.fullName || p.user.email}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {ROLE_LABELS[p.participantRole] || p.participantRole}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Absence Requests */}
      {absences.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            {t("admin.meetings.absenceRequests")}
          </h4>
          <div className="space-y-2">
            {absences.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border border-border/60 dark:border-white/5 bg-card/40 dark:bg-white/[0.02] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {a.participant.user.fullName || a.participant.user.email}
                    </p>
                    <p className="mt-0.5 text-xs text-muted leading-relaxed">{a.reason}</p>
                    {a.reviewNote && (
                      <p className="mt-1 text-xs italic text-muted/80">
                        {t("admin.meetings.note")} {a.reviewNote}
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
                          className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/25 active:scale-95"
                        >
                          <Check className="h-3 w-3 shrink-0" />
                          <span>{t("admin.meetings.approve")}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReview(a.id, "REJECTED")}
                          disabled={reviewAbsence.isPending}
                          className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/15 px-2.5 py-1 text-xs font-medium text-rose-300 transition hover:bg-rose-500/25 active:scale-95"
                        >
                          <X className="h-3 w-3 shrink-0" />
                          <span>{t("admin.meetings.reject")}</span>
                        </button>
                      </div>
                    ) : (
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {ABSENCE_STATUS_LABEL[a.status] || a.status}
                      </span>
                    )
                  ) : (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
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

      {/* Actions */}
      {(canDeleteMeeting || canUpdateMeeting) && meeting.status !== "COMPLETED" && meeting.status !== "CANCELLED" && (
        <div className="border-t border-border/60 dark:border-white/10 pt-4">
          {confirmAction ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-rose-300">
                    {confirmAction === "cancel"
                      ? t("admin.meetings.cancelThisMeeting")
                      : t("admin.meetings.deleteThisMeeting")}
                  </p>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    {confirmAction === "cancel"
                      ? t("admin.meetings.cancelDesc")
                      : t("admin.meetings.deleteDesc")}
                  </p>
                  <div className="mt-3.5 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setConfirmAction(null)}
                      className="rounded-xl border border-border/70 dark:border-white/10 bg-card/60 px-3.5 py-1.5 text-xs text-muted hover:text-foreground transition active:scale-95"
                    >
                      {t("admin.meetings.keepMeeting")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirmAction === "cancel") handleCancel();
                        else handleDelete();
                      }}
                      className="rounded-xl border border-rose-500/40 bg-rose-500/20 px-3.5 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/30 active:scale-95"
                    >
                      {confirmAction === "cancel"
                        ? t("admin.meetings.cancelConfirm")
                        : t("admin.meetings.deleteConfirm")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Discord room permission controls */}
              {meeting.discordChannelId && canUpdateMeeting ? (
                <div className="flex items-center gap-2">
                  {!meeting.discordPermissionsGranted ? (
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={() => grantDiscord.mutate(meeting.id)}
                      disabled={grantDiscord.isPending}
                      className="gap-1.5 text-indigo-300 hover:text-indigo-200"
                    >
                      {grantDiscord.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                      ) : (
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span>{t("admin.meetings.grantDiscordPermissions")}</span>
                    </Button>
                  ) : (
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={() => resetDiscord.mutate(meeting.id)}
                      disabled={resetDiscord.isPending}
                      className="gap-1.5 text-amber-300 hover:text-amber-200"
                    >
                      {resetDiscord.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                      ) : (
                        <Headphones className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span>{t("admin.meetings.resetDiscordPermissions")}</span>
                    </Button>
                  )}
                </div>
              ) : <div />}

              <div className="flex items-center justify-end gap-2.5">
                {canDeleteMeeting && (
                  <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirmAction("delete")}
                  disabled={deleteMeeting.isPending}
                  className="gap-1.5"
                >
                  {deleteMeeting.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>{t("admin.meetings.delete")}</span>
                </Button>
              )}
              {canUpdateMeeting && (
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => setConfirmAction("cancel")}
                  disabled={updateMeeting.isPending}
                  className="gap-1.5 text-rose-300 hover:text-rose-200"
                >
                  {updateMeeting.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>{t("admin.meetings.cancelMeeting")}</span>
                </Button>
              )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
