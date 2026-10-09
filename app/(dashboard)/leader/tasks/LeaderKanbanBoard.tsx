"use client";

import { useMemo } from "react";
import {
  Clock,
  CheckCircle2,
  PlayCircle,
  AlertOctagon,
  FileCheck,
  Calendar,
  Lock,
  Unlock,
  Sparkles,
  Eye,
  UserX,
  RotateCw,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import type { Task } from "@/types/task";

interface LeaderKanbanBoardProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onOpenReview?: (assignmentId: string) => void;
  onOpenReviewExtension?: (assignmentId: string) => void;
  onUnblockTask?: (assignmentId: string) => void;
  isUnblocking?: boolean;
  onOpenAiAssign?: (data: { taskId: string; taskTitle: string; isAssigned: boolean }) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const COLUMNS = [
  {
    id: "TODO",
    icon: Clock,
    color: "text-slate-700 dark:text-slate-400",
    border: "border-slate-300 dark:border-slate-500/30",
    bg: "bg-slate-100/90 dark:bg-slate-500/10",
  },
  {
    id: "IN_PROGRESS",
    icon: PlayCircle,
    color: "text-blue-700 dark:text-blue-400",
    border: "border-blue-300 dark:border-blue-500/30",
    bg: "bg-blue-50 dark:bg-blue-500/10",
  },
  {
    id: "REVIEW",
    icon: FileCheck,
    color: "text-purple-700 dark:text-purple-400",
    border: "border-purple-300 dark:border-purple-500/30",
    bg: "bg-purple-50 dark:bg-purple-500/10",
  },
  {
    id: "DONE",
    icon: CheckCircle2,
    color: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-300 dark:border-emerald-500/30",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
  },
  {
    id: "BLOCKED",
    icon: AlertOctagon,
    color: "text-rose-700 dark:text-rose-400",
    border: "border-rose-300 dark:border-rose-500/30",
    bg: "bg-rose-50 dark:bg-rose-500/10",
  },
] as const;

const priorityBadge: Record<string, string> = {
  HIGH: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30",
  LOW: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30",
};

const checkIsOverdue = (deadline?: string | null) => {
  if (!deadline) return false;
  const d = new Date(deadline);
  d.setHours(23, 59, 59, 999);
  return d < new Date();
};

export default function LeaderKanbanBoard({
  tasks,
  onSelectTask,
  onOpenReview,
  onOpenReviewExtension,
  onUnblockTask,
  isUnblocking,
  onOpenAiAssign,
  onRefresh,
  isRefreshing,
}: LeaderKanbanBoardProps) {
  const t = useTranslations("leader.tasks");
  const locale = useLocale();

  // Group tasks by status
  const columnsData = useMemo(() => {
    const map: Record<string, Task[]> = {
      TODO: [],
      IN_PROGRESS: [],
      REVIEW: [],
      DONE: [],
      BLOCKED: [],
    };

    tasks.forEach((task) => {
      const status = task.assignment?.status || "TODO";
      if (status === "EXTENSION_PENDING") {
        // Extension pending is logically in review/in-progress column, show under REVIEW
        map.REVIEW.push(task);
      } else if (map[status]) {
        map[status].push(task);
      } else {
        map.TODO.push(task);
      }
    });

    return map;
  }, [tasks]);

  return (
    <div className="space-y-4">
      {/* Sub-header / Status summary bar */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            {t("viewKanban")}
          </span>
          <span className="text-xs font-mono text-muted bg-surface-elevated px-2 py-0.5 rounded-md border border-border/80">
            {tasks.length} {t("tasks").toLowerCase()}
          </span>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-surface-elevated px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-slate-100 shadow-xs dark:border-white/10 dark:bg-slate-900/60 dark:hover:bg-white/5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title={isRefreshing ? t("loading") : t("refreshKanban")}
          >
            <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
            <span className="hidden sm:inline">{t("refresh")}</span>
          </button>
        )}
      </div>

      {/* 5-Column Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
        {COLUMNS.map((col) => {
          const Icon = col.icon;
          const colTasks = columnsData[col.id] || [];

          return (
            <div
              key={col.id}
              className="flex flex-col rounded-2xl border border-border/80 bg-surface-elevated/40 dark:border-border/60 dark:bg-slate-900/40 min-h-[500px]"
            >
              {/* Column Header */}
              <div
                className={`flex items-center justify-between p-3.5 border-b border-border/40 rounded-t-2xl ${col.bg}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${col.color}`} />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {col.id === "TODO"
                      ? t("statusTodo")
                      : col.id === "IN_PROGRESS"
                      ? t("statusInProgress")
                      : col.id === "REVIEW"
                      ? t("statusReview")
                      : col.id === "DONE"
                      ? t("statusDone")
                      : t("statusBlocked")}
                  </span>
                </div>
                <span
                  className={`rounded-lg px-2 py-0.5 text-xs font-mono font-bold ${col.bg} ${col.color}`}
                >
                  {colTasks.length}
                </span>
              </div>

              {/* Task list container */}
              <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto max-h-[720px] scrollbar-dropdown">
                {colTasks.length === 0 ? (
                  <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border/80 text-xs text-muted">
                    {t("noTasksFound")}
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const hasPrereqs = Boolean(task.dependsOn && task.dependsOn.length > 0);
                    const unfinishedPrereq = hasPrereqs
                      ? task.dependsOn?.find((p) => p.assignment?.status !== "DONE")
                      : null;
                    const isOverdue =
                      checkIsOverdue(task.deadline) && task.assignment?.status !== "DONE";
                    const isExtensionPending =
                      task.assignment?.status === "EXTENSION_PENDING";

                    return (
                      <div
                        key={task.id}
                        onClick={() => onSelectTask(task)}
                        className="group relative rounded-xl border border-border/80 bg-card p-3.5 shadow-xs transition-all duration-200 hover:border-cyan-400/50 hover:bg-card/90 dark:border-border/60 dark:bg-slate-900/60 dark:hover:border-cyan-400/40 dark:hover:bg-slate-900/90 active:scale-[0.99] cursor-pointer"
                      >
                        {/* Header: Code + Priority + Task Group */}
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded border border-border bg-card/80 text-cyan-600 dark:text-cyan-400">
                              {task.code || "TASK"}
                            </span>
                            {task.taskGroup?.name && (
                              <span
                                className="text-[10px] text-muted truncate max-w-[85px] px-1.5 py-0.5 rounded border border-border/60 bg-surface-elevated"
                                title={task.taskGroup.name}
                              >
                                {task.taskGroup.name}
                              </span>
                            )}
                          </div>
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase ${
                              priorityBadge[task.priority] ?? priorityBadge.MEDIUM
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                          {task.title}
                        </h4>

                        {/* Extension Pending Badge */}
                        {isExtensionPending && (
                          <div className="mb-2">
                            <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100/80 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-300">
                              <Clock className="h-3 w-3 shrink-0" />
                              {t("statusExtensionPending")}
                            </span>
                          </div>
                        )}

                        {/* Dependency status badge */}
                        {hasPrereqs && (
                          <div className="mb-2">
                            {unfinishedPrereq ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                                <Lock className="h-3 w-3 shrink-0" />
                                {t("dependencyWaiting", {
                                  code: unfinishedPrereq.code || unfinishedPrereq.title,
                                })}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                                <Unlock className="h-3 w-3 shrink-0" />
                                {t("dependencyUnlocked")}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Assignee & Support row */}
                        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted mb-2">
                          <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                            {task.assignment?.intern ? (
                              <>
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-cyan-700 dark:bg-slate-800 dark:text-cyan-400 shrink-0">
                                  {task.assignment.intern.fullName?.[0] || "I"}
                                </div>
                                <span className="truncate text-foreground/80 font-medium">
                                  {task.assignment.intern.fullName}
                                </span>
                              </>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[11px]">
                                <UserX className="h-3 w-3 shrink-0" />
                                {t("statusUnassigned")}
                              </span>
                            )}
                          </div>

                          <div
                            className={`flex items-center gap-1 text-[10px] shrink-0 font-mono ${
                              isOverdue ? "text-rose-500 font-bold" : "text-muted"
                            }`}
                          >
                            <Calendar className="h-3 w-3" />
                            <span>
                              {task.deadline
                                ? new Date(task.deadline).toLocaleDateString(
                                    locale === "en" ? "en-US" : "vi-VN",
                                    {
                                      month: "numeric",
                                      day: "numeric",
                                    },
                                  )
                                : "—"}
                            </span>
                          </div>
                        </div>

                        {/* Quick action buttons on card */}
                        <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-border/20">
                          {col.id === "REVIEW" && task.assignment?.id && onOpenReview && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenReview(task.assignment!.id);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-purple-300 bg-purple-100/80 px-2 py-1 text-[11px] font-semibold text-purple-800 transition-all hover:bg-purple-200 dark:border-purple-500/40 dark:bg-purple-500/20 dark:text-purple-300 dark:hover:bg-purple-500/30 active:scale-95 cursor-pointer"
                            >
                              <FileCheck className="h-3 w-3" />
                              <span>{t("reviewSubmission")}</span>
                            </button>
                          )}

                          {isExtensionPending &&
                            task.assignment?.id &&
                            onOpenReviewExtension && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenReviewExtension(task.assignment!.id);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-100/80 px-2 py-1 text-[11px] font-semibold text-amber-800 transition-all hover:bg-amber-200 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30 active:scale-95 cursor-pointer"
                              >
                                <Clock className="h-3 w-3" />
                                <span>{t("reviewExtension")}</span>
                              </button>
                            )}

                          {col.id === "BLOCKED" && task.assignment?.id && onUnblockTask && (
                            <button
                              type="button"
                              disabled={isUnblocking}
                              onClick={(e) => {
                                e.stopPropagation();
                                onUnblockTask(task.assignment!.id);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-100/80 px-2 py-1 text-[11px] font-semibold text-rose-800 transition-all hover:bg-rose-200 dark:border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-300 dark:hover:bg-rose-500/30 active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                              <Unlock className="h-3 w-3" />
                              <span>{t("unblock")}</span>
                            </button>
                          )}

                          {!task.assignment?.internId && onOpenAiAssign && !isOverdue && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenAiAssign({
                                  taskId: task.id,
                                  taskTitle: task.title,
                                  isAssigned: false,
                                });
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-sky-300 bg-sky-100/80 px-2 py-1 text-[11px] font-semibold text-sky-800 transition-all hover:bg-sky-200 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-300 dark:hover:bg-sky-500/30 active:scale-95 cursor-pointer"
                            >
                              <Sparkles className="h-3 w-3" />
                              <span>AI</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTask(task);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/60 px-2 py-1 text-[11px] text-muted hover:text-foreground hover:border-border-strong transition-all active:scale-95 cursor-pointer"
                            title={t("viewDetail")}
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
