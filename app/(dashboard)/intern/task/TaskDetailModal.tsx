"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Calendar,
  User,
  Layers,
  Link,
  Clock,
  Send,
  Pencil,
  Video,
  Play,
  Loader2,
  AlertTriangle,
  Paperclip,
  CheckCircle2,
  FileText,
  Eye,
  Download,
  Lock,
  Workflow,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRBAC } from "@/hooks/rbac/useRBAC";
import { useAuth } from "@/hooks/auth/useAuth";
import { useTask } from "@/hooks/task/useTask";
import { useTaskSubmissions } from "@/hooks/task-submission/useTaskSubmissions";
import { useStartTaskAssignment } from "@/hooks/task-assignment/useStartTaskAssignment";
import { useBlockTaskAssignment } from "@/hooks/task-assignment/useBlockTaskAssignment";
import type { TaskAssignment } from "@/types/task-assignment";
import type { TaskSubmission } from "@/types/task-submission";
import Spinner from "@/components/ui/Spinner";

interface TaskDetailModalProps {
  assignment: TaskAssignment;
  onClose: () => void;
  onOpenSubmission: () => void;
  onViewSubmission: (sub: TaskSubmission) => void;
  onEditSubmission: (sub: TaskSubmission) => void;
  onOpenExtensionRequest?: () => void;
}

const priorityBadge: Record<string, string> = {
  HIGH: "bg-red-500/10 text-red-400 border-red-500/30",
  MEDIUM: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  LOW: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
};

const statusBadge: Record<string, string> = {
  DONE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  IN_PROGRESS: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  REVIEW: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  TODO: "border-slate-500/30 bg-slate-500/10 text-muted-foreground",
  BLOCKED: "border-red-500/30 bg-red-500/10 text-red-400",
  PENDING_APPROVAL: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  EXTENSION_PENDING: "border-amber-500/30 bg-amber-500/10 text-amber-400",
};

export default function TaskDetailModal({
  assignment,
  onClose,
  onOpenSubmission,
  onViewSubmission,
  onEditSubmission,
  onOpenExtensionRequest,
}: TaskDetailModalProps) {
  const t = useTranslations("intern.tasks");
  const { can } = useRBAC();
  const { state: authState } = useAuth();
  const currentUserId = authState.user?.id;
  const currentUserEmail = authState.user?.email;

  const isOwner = Boolean(
    (currentUserEmail && assignment.intern?.user?.email === currentUserEmail) ||
    (currentUserId && assignment.internId === currentUserId) ||
    (currentUserId && assignment.intern?.userId === currentUserId)
  );
  const isSupport = Boolean(
    (currentUserEmail && assignment.support?.user?.email === currentUserEmail) ||
    (currentUserId && assignment.supportId === currentUserId)
  );
  const isMine = isOwner || isSupport;

  const canReadTask = can("TASK_READ");
  const canReadSubmissions = can("TASK_SUBMISSION_READ");
  const canStartTask = can("TASK_ASSIGNMENT_UPDATE");
  const canSubmitTask = can("TASK_SUBMISSION_CREATE");

  const { data: taskData, isLoading: taskLoading } = useTask(assignment.taskId, {
    enabled: canReadTask,
  });
  const task = taskData?.data ?? null;
  const basicTask = task ?? assignment.task;

  const dependsOn = task?.dependsOn ?? assignment.task?.dependsOn ?? [];
  const dependencies = task?.dependencies ?? assignment.task?.dependencies ?? [];
  const hasDependenciesInfo = dependsOn.length > 0 || dependencies.length > 0;

  const startTaskMutation = useStartTaskAssignment();
  const blockTaskMutation = useBlockTaskAssignment();

  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockedReason, setBlockedReason] = useState("");

  const { data: submissionsData } = useTaskSubmissions(
    {
      assignmentId: assignment.id,
      limit: 20,
      sortBy: "attempt",
      order: "desc",
    },
    Boolean(canReadSubmissions && isMine),
  );

  const submissions = submissionsData?.data ?? [];
  const latestSubmission = submissions[0] ?? null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[28px] border border-border bg-card shadow-glass"
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4 bg-card/70 backdrop-blur-sm">
          <div className="min-w-0 pr-4">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md border border-border bg-card/90 text-primary-light">
                {basicTask.code ?? "N/A"}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-mono uppercase font-bold tracking-wider ${
                  statusBadge[assignment.status] ?? ""
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                {t.has(`status${assignment.status}`)
                  ? t(`status${assignment.status}`)
                  : assignment.status.replace("_", " ")}
              </span>
              <span
                className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-mono uppercase font-bold tracking-wider ${
                  priorityBadge[basicTask.priority] ?? ""
                }`}
              >
                {t.has(`priority${basicTask.priority}`)
                  ? t(`priority${basicTask.priority}`)
                  : basicTask.priority}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold metal-text truncate">
              {basicTask.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card/60 text-muted transition-all hover:rotate-90 hover:text-foreground hover:bg-card active:scale-95 cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {taskLoading && !task ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="md" />
            </div>
          ) : (
            <>
              {/* Unassigned or Read-only banner */}
              {!assignment.id || !assignment.internId ? (
                <div className="rounded-2xl border border-amber-300 bg-amber-50/90 px-4 py-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                  {t("unassignedNotice")}
                </div>
              ) : !isMine ? (
                <div className="rounded-2xl border border-indigo-300 bg-indigo-50/90 px-4 py-3 text-xs text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
                  {t("readOnlyTeammateTaskNotice")}
                </div>
              ) : null}

              {/* Status Action Cards */}
              {assignment.status === "DONE" && (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-semibold">
                    {t("completedNotice")}
                  </span>
                </div>
              )}

              {isMine && assignment.status === "TODO" && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span className="text-xs text-cyan-300">
                      {t("readyToStart")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {onOpenExtensionRequest && (
                      <button
                        type="button"
                        onClick={onOpenExtensionRequest}
                        className="flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3.5 py-2 text-xs font-medium text-amber-300 transition hover:bg-amber-500/20 active:scale-95 cursor-pointer"
                      >
                        <Clock className="h-3.5 w-3.5 text-amber-400" />
                        <span>{t("requestExtension")}</span>
                      </button>
                    )}
                    {canStartTask && (
                      <button
                        type="button"
                        onClick={() => startTaskMutation.mutate(assignment.id)}
                        disabled={startTaskMutation.isPending}
                        className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-cyan-500 active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {startTaskMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                        {t("startWorking")}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {assignment.status === "BLOCKED" && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 px-4 py-3.5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-rose-300">
                        {t("blockedMsg")}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">
                        {assignment.blockedReason || t("blockedReasonMissing")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isMine && assignment.status === "EXTENSION_PENDING" && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3.5 text-amber-300">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 shrink-0 text-amber-400 animate-pulse" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">
                        {t("extensionModal.pendingBannerTitle")}
                      </p>
                      <p className="mt-0.5 text-xs text-amber-300/80">
                        {assignment.extensionRequests?.[0]?.reason
                          ? `${t("extensionModal.reason")}: ${assignment.extensionRequests[0].reason}`
                          : t("statusExtensionPending")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {assignment.status === "IN_PROGRESS" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card/60 p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-400 shrink-0" />
                      <span className="text-xs text-foreground/90 font-medium">
                        {t("taskInProgressNotice")}
                      </span>
                    </div>

                    {isMine && (
                      <div className="flex flex-wrap items-center gap-2.5">
                        {onOpenExtensionRequest && (
                          <button
                            type="button"
                            onClick={onOpenExtensionRequest}
                            className="flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3.5 py-2 text-xs font-medium text-amber-300 transition hover:bg-amber-500/20 active:scale-95 cursor-pointer"
                          >
                            <Clock className="h-3.5 w-3.5 text-amber-400" />
                            <span>{t("requestExtension")}</span>
                          </button>
                        )}

                        {canSubmitTask && (
                          <>
                            {latestSubmission?.reviewStatus !== "PENDING" && (
                              <button
                                type="button"
                                onClick={onOpenSubmission}
                                className="flex items-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-xs font-medium text-cyan-300 transition hover:border-cyan-400/50 hover:bg-cyan-500/20 active:scale-95 cursor-pointer shadow-sm"
                              >
                                <Send className="h-3.5 w-3.5" />
                                {t("submitWork")}
                              </button>
                            )}

                            {!showBlockForm && (
                              <button
                                type="button"
                                onClick={() => setShowBlockForm(true)}
                                className="flex items-center gap-1.5 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3.5 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20 active:scale-95 cursor-pointer"
                              >
                                <AlertTriangle className="h-3.5 w-3.5" />
                                {t("blockTask")}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {isMine && canSubmitTask && showBlockForm && (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                      <div>
                        <label
                          htmlFor={`blocked-reason-${assignment.id}`}
                          className="text-xs font-semibold text-amber-300"
                        >
                          {t("blockReason")}
                        </label>
                        <textarea
                          id={`blocked-reason-${assignment.id}`}
                          value={blockedReason}
                          onChange={(e) => setBlockedReason(e.target.value)}
                          maxLength={2000}
                          rows={3}
                          autoFocus
                          placeholder={t("blockReasonPlaceholder")}
                          className="mt-2 w-full resize-y rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-amber-400/50"
                        />
                        <p className="mt-1 text-right text-[10px] text-muted">
                          {blockedReason.length}/2000
                        </p>
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowBlockForm(false);
                            setBlockedReason("");
                          }}
                          disabled={blockTaskMutation.isPending}
                          className="rounded-xl border border-border px-3.5 py-1.5 text-xs text-muted hover:text-foreground transition hover:bg-card active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          {t("cancelBlock")}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            blockTaskMutation.mutate(
                              {
                                id: assignment.id,
                                blockedReason: blockedReason.trim(),
                              },
                              {
                                onSuccess: () => {
                                  setShowBlockForm(false);
                                  setBlockedReason("");
                                },
                              },
                            )
                          }
                          disabled={
                            blockTaskMutation.isPending ||
                            blockedReason.trim().length === 0
                          }
                          className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-amber-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        >
                          {blockTaskMutation.isPending && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          )}
                          {t("confirmBlock")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Basic Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 rounded-2xl border border-border/70 bg-card/40 p-4">
                <DetailRow
                  icon={Calendar}
                  label={t("targetDeadline")}
                  value={
                    basicTask.deadline
                      ? new Date(basicTask.deadline).toLocaleDateString("vi-VN")
                      : "—"
                  }
                />
                <DetailRow
                  icon={Calendar}
                  label={t("assignedAt")}
                  value={
                    assignment.assignedAt
                      ? new Date(assignment.assignedAt).toLocaleDateString("vi-VN")
                      : "—"
                  }
                />
                <DetailRow
                  icon={User}
                  label={t("roleOwner")}
                  value={assignment.intern?.fullName ?? "—"}
                />
                <DetailRow
                  icon={User}
                  label={t("assignedBy")}
                  value={assignment.assigner?.fullName ?? "—"}
                />
                <DetailRow
                  icon={User}
                  label={t("support")}
                  value={assignment.support?.fullName ?? "—"}
                />
                <DetailRow
                  icon={Layers}
                  label={t("group")}
                  value={task?.taskGroup?.name ?? "—"}
                />
                {task?.startDate && (
                  <DetailRow
                    icon={Calendar}
                    label={t("startDate")}
                    value={new Date(task.startDate).toLocaleDateString("vi-VN")}
                  />
                )}
                {task?.estDays && (
                  <DetailRow
                    label={t("estDuration")}
                    value={t("days", { n: task.estDays })}
                  />
                )}
              </div>

              {/* Task Dependencies & Prerequisites */}
              {hasDependenciesInfo && (
                <div className="space-y-3 rounded-2xl border border-border/80 bg-card/40 p-4">
                  {/* 1. Prerequisites (dependsOn) */}
                  {dependsOn.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                          {t("dependsOnSection")} ({dependsOn.length})
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {dependsOn.map((prereq) => {
                          const pStatus = prereq.assignment?.status || "TODO";
                          const isDone = pStatus === "DONE";
                          const isBlocked = pStatus === "BLOCKED";

                          return (
                            <div
                              key={prereq.id}
                              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3 transition-all ${
                                isDone
                                  ? "border-emerald-300/80 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                                  : isBlocked
                                  ? "border-rose-300/80 bg-rose-50/50 dark:border-rose-500/30 dark:bg-rose-500/10"
                                  : "border-border/80 bg-surface-elevated/60 dark:border-border/60 dark:bg-slate-900/60"
                              }`}
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div className="mt-0.5 shrink-0">
                                  {isDone ? (
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    </span>
                                  ) : (
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                                      <Lock className="h-3.5 w-3.5" />
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
                                      {prereq.code || "TASK"}
                                    </span>
                                    {prereq.assignment?.intern?.fullName && (
                                      <span className="text-[11px] text-muted">
                                        • {t("prereqAssignee")}: <span className="font-medium text-foreground">{prereq.assignment.intern.fullName}</span>
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs font-semibold text-foreground line-clamp-1 mt-0.5">
                                    {prereq.title}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                                    isDone
                                      ? "border-emerald-200 bg-emerald-100/80 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300"
                                      : isBlocked
                                      ? "border-rose-200 bg-rose-100/80 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-300"
                                      : "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-600/40 dark:bg-slate-700/20 dark:text-slate-300"
                                  }`}
                                >
                                  {isDone ? t("prereqCompleted") : pStatus}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. Successors (dependencies) */}
                  {dependencies.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <Workflow className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                          {t("dependenciesSection")} ({dependencies.length})
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {dependencies.map((dep) => (
                          <div
                              key={dep.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/80 bg-surface-elevated/40 p-3 dark:border-border/60 dark:bg-slate-900/40"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                                  {dep.code || "TASK"}
                                </span>
                                <p className="text-xs font-medium text-foreground line-clamp-1">
                                  {dep.title}
                                </p>
                              </div>
                              {dep.assignment?.intern?.fullName && (
                                <span className="text-[11px] text-muted shrink-0">
                                  {t("prereqAssignee")}: <span className="font-medium text-foreground">{dep.assignment.intern.fullName}</span>
                                </span>
                              )}
                            </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Task Description */}
              {basicTask.description && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted">
                      {t("description")}
                    </h4>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card/30 p-4 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {basicTask.description}
                  </div>
                </div>
              )}

              {/* Acceptance Criteria */}
              {task?.acceptanceCriteria && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted">
                      {t("acceptanceCriteria")}
                    </h4>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-card/30 p-4 text-sm text-foreground/90 leading-relaxed font-mono whitespace-pre-line">
                    {task.acceptanceCriteria}
                  </div>
                </div>
              )}

              {/* Notes */}
              {task?.taskNotes && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted">
                    {t("notes")}
                  </h4>
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-300/90 leading-relaxed italic whitespace-pre-wrap">
                    {task.taskNotes}
                  </div>
                </div>
              )}

              {/* Task Attachments */}
              {task && task.attachments && task.attachments.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted">
                      {t("attachments", { n: task.attachments.length })}
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {task.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between rounded-xl border border-border bg-card/60 px-4 py-2.5 text-xs text-foreground transition hover:border-cyan-400/40 hover:bg-card hover:text-cyan-400"
                      >
                        <div className="flex items-center gap-2 overflow-hidden pr-2">
                          <Link className="h-3.5 w-3.5 shrink-0 text-muted group-hover:text-cyan-400" />
                          <span className="truncate font-mono font-medium">
                            {att.fileName}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono uppercase border border-border px-2 py-0.5 rounded-md bg-card transition-colors shrink-0 flex items-center gap-1 text-muted group-hover:text-cyan-400">
                          <Download className="h-3 w-3" />
                          {t("open")}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Submission History */}
              {isMine && canReadSubmissions && submissions.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-border/60">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-cyan-400" />
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted">
                      {t("submissionHistory", { n: submissions.length })}
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {submissions.map((sub) => {
                      const isLatest = sub.id === latestSubmission?.id;
                      return (
                        <div
                          key={sub.id}
                          className={`rounded-2xl border p-4 transition-all ${
                            isLatest
                              ? "border-cyan-500/40 bg-gradient-to-r from-cyan-500/5 to-transparent shadow-sm"
                              : "border-border/70 bg-card/40"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-foreground">
                                #{sub.attempt}
                              </span>
                              <span
                                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase ${
                                  sub.reviewStatus === "APPROVED"
                                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                                    : sub.reviewStatus === "REJECTED"
                                    ? "border-red-500/40 bg-red-500/10 text-red-400"
                                    : "border-amber-500/40 bg-amber-500/10 text-amber-400"
                                }`}
                              >
                                {sub.reviewStatus}
                              </span>
                              {isLatest && (
                                <span className="text-[10px] text-cyan-400 font-mono bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.5 rounded-md">
                                  {t("latest")}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-muted">
                                {new Date(sub.submittedAt).toLocaleString("vi-VN")}
                              </span>
                              <button
                                onClick={() => onViewSubmission(sub)}
                                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 px-2 py-1 rounded-lg border border-cyan-400/20 bg-cyan-500/10 hover:bg-cyan-500/20 transition cursor-pointer"
                              >
                                <Eye className="h-3 w-3" />
                                {t("view")}
                              </button>
                              {sub.reviewStatus === "PENDING" && isLatest && (
                                <button
                                  onClick={() => onEditSubmission(sub)}
                                  className="flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-300 transition hover:bg-amber-500/20 active:scale-95 cursor-pointer"
                                >
                                  <Pencil className="h-3 w-3" />
                                  {t("edit")}
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            {sub.prLink && (
                              <a
                                href={sub.prLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition"
                              >
                                <Link className="h-3 w-3 shrink-0" />
                                <span className="truncate">{sub.prLink}</span>
                              </a>
                            )}
                            {sub.videoDemo && (
                              <a
                                href={sub.videoDemo}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition"
                              >
                                <Video className="h-3 w-3 shrink-0" />
                                <span className="truncate">Video Demo</span>
                              </a>
                            )}
                            {sub.attachments && sub.attachments.length > 0 && (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-xs text-muted">
                                  <Paperclip className="h-3 w-3 shrink-0" />
                                  <span>
                                    {t("attachments", {
                                      n: sub.attachments.length,
                                    })}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 pl-4.5">
                                  {sub.attachments.map((attachment) => (
                                    <a
                                      key={attachment.id}
                                      href={attachment.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title={attachment.fileName}
                                      className="max-w-full truncate rounded-md border border-border bg-card px-2 py-1 text-[11px] text-foreground/80 transition hover:border-cyan-400/40 hover:text-cyan-400"
                                    >
                                      {attachment.fileName}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                            {sub.note && (
                              <p className="text-xs text-muted leading-relaxed">
                                {sub.note}
                              </p>
                            )}
                            {sub.reviewComment && (
                              <div className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                                <p className="text-[10px] text-amber-400/80 uppercase tracking-wider mb-0.5 font-semibold">
                                  {t("reviewComment")}
                                </p>
                                <p className="text-xs text-amber-300 italic">
                                  {sub.reviewComment}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 text-[10px] font-bold font-mono tracking-wider uppercase text-muted">
        {Icon && <Icon className="h-3 w-3 shrink-0 text-muted" />}
        <span>{label}</span>
      </div>
      <div className="text-sm font-medium text-foreground mt-0.5 truncate">
        {value}
      </div>
    </div>
  );
}
