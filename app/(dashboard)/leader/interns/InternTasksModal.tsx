"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  FileText,
  Link as LinkIcon,
  Calendar,
  User,
  Layers,
  ChevronRight,
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Circle,
  ExternalLink,
  GitPullRequest,
  Video,
  MessageSquare,
  ListTodo,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useTaskAssignments } from "@/hooks/task-assignment/useTaskAssignments";
import { useTask } from "@/hooks/task/useTask";
import { useTaskSubmissionThread } from "@/hooks/task-submission/useTaskSubmissionThread";
import type { Intern } from "@/types/intern";
import type { TaskAssignment } from "@/types/task-assignment";
import type { TaskSubmissionThreadItem } from "@/types/task-submission";
import Spinner from "@/components/ui/Spinner";

type Props = { intern: Intern; onClose: () => void };

const priorityBadge: Record<string, string> = {
  HIGH: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  MEDIUM: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  LOW: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
};

const statusBadge: Record<string, string> = {
  DONE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  IN_PROGRESS: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  REVIEW: "border-purple-500/30 bg-purple-500/10 text-purple-400",
  TODO: "border-border bg-card/60 text-muted",
  BLOCKED: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  PENDING_APPROVAL: "border-amber-500/30 bg-amber-500/10 text-amber-400",
};

const reviewStatusBadge: Record<string, string> = {
  APPROVED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  REJECTED: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  PENDING: "border-amber-500/30 bg-amber-500/10 text-amber-400",
};

function extractArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && "data" in data && Array.isArray((data as { data: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}

type FilterKey = "ALL" | "IN_PROGRESS" | "REVIEW" | "DONE" | "OVERDUE";

export default function InternTasksModal({ intern, onClose }: Props) {
  const t = useTranslations("leader.interns");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterKey>("ALL");

  const { data: assignmentsData, isLoading: listLoading } = useTaskAssignments({
    internId: intern.id,
    limit: 100,
  });

  const assignments = extractArray<TaskAssignment>(assignmentsData?.data);


  const { data: taskData, isLoading: taskLoading } = useTask(selectedTaskId ?? undefined);
  const task = taskData?.data ?? null;
  const selectedAssignment = assignments.find((a) => a.taskId === selectedTaskId);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Counts for quick filter tabs
  const now = useMemo(() => new Date(), []);
  const completedCount = useMemo(() => assignments.filter((a) => a.status === "DONE").length, [assignments]);
  const inProgressCount = useMemo(() => assignments.filter((a) => a.status === "IN_PROGRESS").length, [assignments]);
  const reviewCount = useMemo(() => assignments.filter((a) => a.status === "REVIEW" || a.status === "PENDING_APPROVAL").length, [assignments]);
  const overdueCount = useMemo(() => assignments.filter((a) => new Date(a.task.deadline) < now && a.status !== "DONE").length, [assignments, now]);

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      // Search matching
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const codeMatch = a.task.code?.toLowerCase().includes(query) ?? false;
        const titleMatch = a.task.title.toLowerCase().includes(query);
        if (!codeMatch && !titleMatch) return false;
      }

      // Status matching
      if (statusFilter === "IN_PROGRESS") return a.status === "IN_PROGRESS";
      if (statusFilter === "REVIEW") return a.status === "REVIEW" || a.status === "PENDING_APPROVAL";
      if (statusFilter === "DONE") return a.status === "DONE";
      if (statusFilter === "OVERDUE") return new Date(a.task.deadline) < now && a.status !== "DONE";

      return true;
    });
  }, [assignments, searchQuery, statusFilter, now]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-2 sm:p-4 backdrop-blur-md"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-5xl h-[92vh] sm:h-[85vh] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl text-foreground"
      >
        {/* Modal Header: Rule 44 (Icon + Heading in flex container) */}
        <div className="relative flex items-center justify-between border-b border-border/60 px-5 sm:px-6 py-4 bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 text-cyan-400 shrink-0 shadow-sm">
              <ListTodo className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold tracking-wide uppercase metal-text truncate">
                {t("tasksModalTitle", { name: intern.fullName })}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted mt-0.5">
                <span>{t("tasksModalTotal", { count: assignments.length })}</span>
                <span>•</span>
                <span className="text-emerald-400 font-medium">{completedCount} {t("tasksModalFilterDone")}</span>
                {overdueCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-rose-400 font-medium">{overdueCount} {t("tasksModalFilterOverdue")}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card/60 text-muted transition-all hover:border-cyan-500/40 hover:bg-card hover:text-foreground active:scale-95 shadow-sm ml-3 shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body: Split view adhering to Rule 46 (seamless borderless detail column) */}
        <div className="flex flex-1 overflow-hidden relative flex-col md:flex-row">
          {listLoading ? (
            <div className="flex w-full items-center justify-center py-24">
              <Spinner size="lg" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="flex w-full flex-col items-center justify-center py-16 text-center text-muted px-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/10 text-muted mb-3">
                <FileText className="h-7 w-7 stroke-[1.2]" />
              </div>
              <p className="text-sm font-semibold tracking-wide">{t("tasksModalEmpty")}</p>
            </div>
          ) : (
            <>
              {/* Left Column: Task list registry with search & filters */}
              <div
                className={`w-full md:w-5/12 lg:w-4/12 border-b md:border-b-0 md:border-r border-border/40 overflow-y-auto p-3 sm:p-4 space-y-3 bg-card/30 ${
                  selectedTaskId ? "hidden md:flex md:flex-col" : "flex flex-col"
                }`}
              >
                {/* Search box */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("tasksModalSearchPlaceholder")}
                    className="w-full rounded-xl border border-border/60 bg-card/60 pl-8 pr-8 py-2 text-xs text-foreground placeholder:text-muted/60 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-sm"
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <FilterPill
                    label={t("tasksModalFilterAll")}
                    count={assignments.length}
                    active={statusFilter === "ALL"}
                    onClick={() => setStatusFilter("ALL")}
                  />
                  <FilterPill
                    label={t("tasksModalFilterInProgress")}
                    count={inProgressCount}
                    active={statusFilter === "IN_PROGRESS"}
                    onClick={() => setStatusFilter("IN_PROGRESS")}
                  />
                  <FilterPill
                    label={t("tasksModalFilterReview")}
                    count={reviewCount}
                    active={statusFilter === "REVIEW"}
                    onClick={() => setStatusFilter("REVIEW")}
                  />
                  <FilterPill
                    label={t("tasksModalFilterDone")}
                    count={completedCount}
                    active={statusFilter === "DONE"}
                    onClick={() => setStatusFilter("DONE")}
                  />
                  {overdueCount > 0 && (
                    <FilterPill
                      label={t("tasksModalFilterOverdue")}
                      count={overdueCount}
                      active={statusFilter === "OVERDUE"}
                      onClick={() => setStatusFilter("OVERDUE")}
                      danger
                    />
                  )}
                </div>

                {/* Registry List */}
                <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
                  {filteredAssignments.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted">
                      <p>{t("tasksModalNoMatch")}</p>
                      {(searchQuery || statusFilter !== "ALL") && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setStatusFilter("ALL");
                          }}
                          className="mt-2 text-cyan-400 hover:text-cyan-300 font-medium"
                        >
                          {t("clearFilters")}
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredAssignments.map((a) => (
                      <TaskRowButton
                        key={a.id}
                        assignment={a}
                        isSelected={selectedTaskId === a.taskId}
                        onClick={() => setSelectedTaskId(a.taskId)}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Seamless Borderless Task Detail Panel (Rule 46) */}
              <div
                className={`w-full md:w-7/12 lg:w-8/12 overflow-y-auto p-4 sm:p-6 bg-card/10 relative ${
                  selectedTaskId ? "block" : "hidden md:flex md:flex-col md:items-center md:justify-center"
                }`}
              >
                {selectedTaskId ? (
                  <>
                    {/* Mobile Back Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedTaskId(null)}
                      className="md:hidden inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground mb-4 py-1.5 px-3 rounded-xl border border-border/60 bg-card/60 active:scale-95 shadow-sm"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                      <span>{t("tasksModalBackToList")}</span>
                    </button>

                    {taskLoading ? (
                      <div className="flex h-full items-center justify-center py-24">
                        <Spinner size="md" />
                      </div>
                    ) : task ? (
                      <TaskDetailPanel task={task} assignment={selectedAssignment} />
                    ) : (
                      <p className="text-center text-sm text-rose-400 py-12">
                        {t("tasksModalFetchError")}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center text-muted py-16 px-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/10 text-muted mb-3 animate-pulse">
                      <Layers className="h-7 w-7 stroke-[1]" />
                    </div>
                    <p className="text-xs uppercase tracking-wider font-medium">
                      {t("tasksModalSelectHint")}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ─── Filter Pill ───────────────────────────────────────────── */

function FilterPill({
  label,
  count,
  active,
  danger,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
        active
          ? danger
            ? "border border-rose-500/40 bg-rose-500/15 text-rose-400 shadow-sm"
            : "border border-cyan-500/50 bg-cyan-500/15 text-cyan-400 shadow-sm"
          : "border border-border/40 bg-card/60 text-muted hover:border-border hover:bg-card hover:text-foreground"
      }`}
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
          active
            ? danger
              ? "bg-rose-500/20 text-rose-400"
              : "bg-cyan-500/20 text-cyan-400"
            : "bg-muted/20 text-muted"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

/* ─── Left Column Task Item Card ───────────────────────────── */

function TaskRowButton({
  assignment,
  isSelected,
  onClick,
}: {
  assignment: TaskAssignment;
  isSelected: boolean;
  onClick: () => void;
}) {
  const locale = useLocale();
  const isOverdue =
    new Date(assignment.task.deadline) < new Date() && assignment.status !== "DONE";

  const statusColors: Record<string, string> = {
    DONE: "bg-emerald-400",
    IN_PROGRESS: "bg-blue-400",
    REVIEW: "bg-purple-400",
    TODO: "bg-muted",
    BLOCKED: "bg-rose-400",
    PENDING_APPROVAL: "bg-amber-400",
  };

  const deadlineFormatted = new Date(assignment.task.deadline).toLocaleDateString(
    locale === "vi" ? "vi-VN" : "en-GB",
    {
      day: "2-digit",
      month: "2-digit",
    },
  );

  return (
    <button
      onClick={onClick}
      type="button"
      className={`group relative flex w-full flex-col gap-1.5 rounded-xl border p-3 text-left transition-all duration-200 active:scale-[0.98] ${
        isSelected
          ? "border-cyan-500/50 bg-cyan-500/10 text-foreground shadow-sm ring-1 ring-cyan-500/30"
          : "border-border/40 bg-card/60 text-muted hover:border-border hover:bg-card hover:text-foreground"
      }`}
    >
      {/* Accent Indicator Bar */}
      <div
        className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full transition-all ${
          isSelected ? "bg-cyan-400" : statusColors[assignment.status] || "bg-muted"
        }`}
      />

      {/* Top line: Code + Status Badge + Priority */}
      <div className="flex items-center justify-between gap-1.5 pl-2">
        <span className="font-mono text-xs font-bold tracking-wider text-cyan-400">
          {assignment.task.code || "UNTITLED"}
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
              statusBadge[assignment.status] ?? "border-border text-muted"
            }`}
          >
            <Circle className="h-1.5 w-1.5 fill-current" />
            {assignment.status.replace("_", " ")}
          </span>
          <span
            className={`inline-flex rounded-full border px-1.5 py-0.2 text-[10px] font-semibold ${
              priorityBadge[assignment.task.priority] ?? "border-border text-muted"
            }`}
          >
            {assignment.task.priority}
          </span>
        </div>
      </div>

      {/* Task Title */}
      <div className="pl-2 pr-4">
        <h4 className="text-xs font-medium text-foreground line-clamp-2 group-hover:text-cyan-400 transition-colors">
          {assignment.task.title}
        </h4>
      </div>

      {/* Bottom line: Deadline & Indicators */}
      <div className="flex items-center justify-between pl-2 text-[11px] text-muted pt-0.5">
        <div
          className={`flex items-center gap-1 font-medium ${
            isOverdue ? "text-rose-400" : "text-muted"
          }`}
        >
          {isOverdue ? (
            <AlertTriangle className="h-3 w-3 shrink-0 text-rose-400" />
          ) : (
            <Calendar className="h-3 w-3 shrink-0 text-muted" />
          )}
          <span>{deadlineFormatted}</span>
        </div>
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${
            isSelected ? "translate-x-0.5 text-cyan-400" : "text-muted group-hover:translate-x-0.5"
          }`}
        />
      </div>
    </button>
  );
}

/* ─── Right Column: Task Detail Panel (Rule 46 Seamless Borderless) ── */

function TaskDetailPanel({
  task,
  assignment,
}: {
  task: NonNullable<ReturnType<typeof useTask>["data"]>["data"];
  assignment: TaskAssignment | undefined;
}) {
  const t = useTranslations("leader.interns");
  const locale = useLocale();

  // Fetch thread submissions for this assignment
  const { data: threadData, isLoading: threadLoading } = useTaskSubmissionThread(assignment?.id);
  const thread = threadData?.data?.thread ?? [];

  const fmtDate = (dStr?: string | null) => {
    if (!dStr) return "—";
    return new Date(dStr).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const isOverdue =
    assignment && task.deadline && new Date(task.deadline) < new Date() && assignment.status !== "DONE";

  return (
    <div className="space-y-6">
      {/* Detail Header */}
      <div className="space-y-2 border-b border-border/40 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs bg-card border border-border text-cyan-400 px-2.5 py-1 rounded-lg font-bold shadow-sm">
            {task.code ?? "UNTITLED-UNIT"}
          </span>
          {assignment && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${
                statusBadge[assignment.status] ?? ""
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              {assignment.status.replace("_", " ")}
            </span>
          )}
          <span
            className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${
              priorityBadge[task.priority] ?? ""
            }`}
          >
            {task.priority}
          </span>
          {isOverdue && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t("tasksModalFilterOverdue")}
            </span>
          )}
        </div>
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {task.title}
        </h3>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-card/60 border border-border/40 p-4 rounded-xl shadow-sm">
        <DetailGridRow
          icon={Calendar}
          label={t("tasksModalTargetDeadline")}
          value={
            <span className={isOverdue ? "text-rose-400 font-bold" : "text-foreground"}>
              {fmtDate(task.deadline)}
            </span>
          }
        />
        <DetailGridRow
          icon={User}
          label={t("tasksModalAssignedBy")}
          value={task.creator.fullName ?? task.creator.email}
        />
        <DetailGridRow
          icon={Layers}
          label={t("tasksModalGroup")}
          value={task.taskGroup?.name ?? "—"}
        />
        <DetailGridRow
          icon={Calendar}
          label={t("tasksModalActivation")}
          value={task.startDate ? fmtDate(task.startDate) : "—"}
        />
        {task.estDays && (
          <div className="sm:col-span-2 pt-2 border-t border-border/40">
            <DetailGridRow
              icon={Clock}
              label={t("tasksModalEstDuration")}
              value={t("tasksModalSystemDays", { days: task.estDays })}
            />
          </div>
        )}
      </div>

      {/* Descriptions & Criteria */}
      <div className="space-y-4">
        {task.description && (
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted">
              {t("tasksModalObjective")}
            </h4>
            <div className="rounded-xl border border-border/40 bg-card/40 p-4 text-sm text-foreground/90 leading-relaxed">
              {task.description}
            </div>
          </div>
        )}

        {task.acceptanceCriteria && (
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted">
              {t("tasksModalCriteria")}
            </h4>
            <div className="rounded-xl border border-border/40 bg-card/40 p-4 text-sm text-foreground/90 leading-relaxed font-mono whitespace-pre-line text-xs sm:text-sm">
              {task.acceptanceCriteria}
            </div>
          </div>
        )}

        {task.taskNotes && (
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted">
              {t("tasksModalNotes")}
            </h4>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-300/90 leading-relaxed italic">
              {task.taskNotes}
            </div>
          </div>
        )}
      </div>

      {/* Attachments */}
      {task.attachments.length > 0 && (
        <div className="space-y-2 pt-2">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted">
            {t("tasksModalVaults", { count: task.attachments.length })}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {task.attachments.map((att) => (
              <a
                key={att.id}
                href={att.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-xl border border-border bg-card/60 px-4 py-2.5 text-xs text-foreground transition-all hover:border-cyan-500/40 hover:bg-card hover:text-cyan-400 shadow-sm"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <LinkIcon className="h-3.5 w-3.5 shrink-0 text-muted group-hover:text-cyan-400" />
                  <span className="truncate font-mono">{att.fileName}</span>
                </div>
                <ExternalLink className="h-3 w-3 shrink-0 text-muted group-hover:text-cyan-400 ml-2" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Submissions Thread Section */}
      <div className="space-y-3 pt-4 border-t border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary-light shrink-0" />
            <h4 className="text-sm font-bold uppercase tracking-wide metal-text">
              {t("tasksModalSubmissions")}
            </h4>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            {thread.length}
          </span>
        </div>

        {threadLoading ? (
          <div className="flex items-center justify-center py-6">
            <Spinner size="sm" />
          </div>
        ) : thread.length === 0 ? (
          <div className="rounded-xl border border-border/30 bg-card/30 p-4 text-center text-xs text-muted">
            <p>{t("tasksModalNoSubmissions")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {thread.map((item: TaskSubmissionThreadItem) => (
              <SubmissionItemCard key={item.id} item={item} fmtDate={fmtDate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Submission Item Card ─────────────────────────────────── */

function SubmissionItemCard({
  item,
  fmtDate,
}: {
  item: TaskSubmissionThreadItem;
  fmtDate: (d: string) => string;
}) {
  const t = useTranslations("leader.interns");

  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-4 space-y-3 shadow-sm hover:border-cyan-500/30 transition-all">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-foreground">
            {t("tasksModalAttempt", { attempt: item.attempt })}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
              reviewStatusBadge[item.reviewStatus] ?? "border-border text-muted"
            }`}
          >
            <Circle className="h-1.5 w-1.5 fill-current" />
            {item.reviewStatus}
          </span>
        </div>
        <span className="text-xs text-muted">{fmtDate(item.submittedAt)}</span>
      </div>

      {/* Links & Demo */}
      {(item.prLink || item.videoDemo) && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {item.prLink && (
            <a
              href={item.prLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-2.5 py-1 text-foreground hover:border-cyan-500/40 hover:text-cyan-400 transition-colors shadow-sm"
            >
              <GitPullRequest className="h-3.5 w-3.5 text-cyan-400" />
              <span>{t("tasksModalPrLink")}</span>
              <ExternalLink className="h-3 w-3 text-muted ml-0.5" />
            </a>
          )}
          {item.videoDemo && (
            <a
              href={item.videoDemo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-2.5 py-1 text-foreground hover:border-cyan-500/40 hover:text-cyan-400 transition-colors shadow-sm"
            >
              <Video className="h-3.5 w-3.5 text-blue-400" />
              <span>{t("tasksModalVideoDemo")}</span>
              <ExternalLink className="h-3 w-3 text-muted ml-0.5" />
            </a>
          )}
        </div>
      )}

      {/* Intern Note */}
      {item.note && (
        <div className="text-xs text-muted-foreground bg-card/40 rounded-lg p-2.5 border border-border/30">
          <p className="font-medium text-foreground mb-0.5">Ghi chú:</p>
          <p className="leading-relaxed">{item.note}</p>
        </div>
      )}

      {/* Leader Review Comment */}
      {item.reviewComment && (
        <div className="text-xs rounded-lg p-2.5 border border-cyan-500/20 bg-cyan-500/5 text-cyan-300">
          <div className="flex items-center gap-1.5 font-semibold text-cyan-400 mb-0.5">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{t("tasksModalReviewComment")}</span>
            {item.reviewer && (
              <span className="text-muted font-normal">
                ({item.reviewer.fullName || item.reviewer.email})
              </span>
            )}
          </div>
          <p className="leading-relaxed text-foreground/90">{item.reviewComment}</p>
        </div>
      )}

      {/* Submission Attachments */}
      {item.attachments && item.attachments.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {item.attachments.map((att) => (
            <a
              key={att.id}
              href={att.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-cyan-400 font-mono border border-border/40 rounded px-2 py-0.5 bg-card/30 transition-colors"
            >
              <LinkIcon className="h-3 w-3" />
              <span className="truncate max-w-[150px]">{att.fileName}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Detail Grid Row ──────────────────────────────────────── */

function DetailGridRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 p-1">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
        {Icon && <Icon className="h-3 w-3 shrink-0 text-muted" />}
        <span>{label}</span>
      </div>
      <div className="text-sm font-medium text-foreground mt-0.5">{value}</div>
    </div>
  );
}
