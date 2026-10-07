"use client";

import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import {
  X,
  Calendar,
  User,
  Layers,
  Link,
  GitBranch,
  Paperclip,
  FileText,
  Film,
  FileArchive,
  ImageIcon,
} from "lucide-react";
import type { Task } from "@/types/task";

type Props = {
  task: Task;
  onClose: () => void;
};

const priorityBadge: Record<string, string> = {
  HIGH: "border border-red-300 bg-red-100/80 text-red-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400",
  MEDIUM: "border border-amber-300 bg-amber-100/80 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400",
  LOW: "border border-emerald-300 bg-emerald-100/80 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400",
};

const statusBadge: Record<string, string> = {
  DONE: "border-emerald-300 bg-emerald-100/80 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  IN_PROGRESS: "border-sky-300 bg-sky-100/80 text-sky-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
  REVIEW: "border-purple-300 bg-purple-100/80 text-purple-800 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300",
  TODO: "border-slate-300 bg-slate-100/90 text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400",
  BLOCKED: "border-rose-300 bg-rose-100/80 text-rose-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
  PENDING_APPROVAL: "border-amber-300 bg-amber-100/80 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  EXTENSION_PENDING: "border-amber-300 bg-amber-100/90 text-amber-800 font-bold dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-300",
  UNASSIGNED: "border-orange-300 bg-orange-100/80 text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300",
};

function getFileIcon(mime: string) {
  const t = mime.split("/")[0];
  if (t === "image") return <ImageIcon className="h-4 w-4 shrink-0 text-emerald-400" />;
  if (t === "video") return <Film className="h-4 w-4 shrink-0 text-cyan-400" />;
  if (mime.includes("zip") || mime.includes("rar") || mime.includes("7z"))
    return <FileArchive className="h-4 w-4 shrink-0 text-indigo-400" />;
  if (mime.includes("pdf") || mime.includes("document") || mime.includes("sheet"))
    return <FileText className="h-4 w-4 shrink-0 text-amber-400" />;
  return <Paperclip className="h-4 w-4 shrink-0 text-muted" />;
}

function formatSize(bytes: number) {
  if (bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TaskViewModal({ task, onClose }: Props) {
  const t = useTranslations("leader.tasks");

  const getStatusLabel = (s: string) => {
    switch (s) {
      case "TODO":
        return t("statusTodo");
      case "IN_PROGRESS":
        return t("statusInProgress");
      case "REVIEW":
        return t("statusReview");
      case "DONE":
        return t("statusDone");
      case "BLOCKED":
        return t("statusBlocked");
      case "PENDING_APPROVAL":
        return t("statusPendingApproval");
      case "EXTENSION_PENDING":
        return t("statusExtensionPending");
      case "UNASSIGNED":
        return t("statusUnassigned");
      default:
        return s.replace("_", " ");
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center bg-black/75 p-4 pt-[5vh] backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[28px] border border-border bg-card shadow-glass dark:border-white/10"
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-slate-100 hover:bg-slate-200 text-muted hover:text-foreground transition-all cursor-pointer dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="border-b border-border dark:border-white/10 pb-4">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-mono text-xs text-slate-500">{task.code || "—"}</span>
              {task.priority && (
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full ${priorityBadge[task.priority] ?? ""}`}>
                  {task.priority}
                </span>
              )}
              {task.assignment?.status && (
                <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-medium border ${statusBadge[task.assignment.status] ?? "border-border bg-card text-muted"}`}>
                  {getStatusLabel(task.assignment.status)}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold metal-text">{task.title}</h2>
          </div>

          {/* Card 1: Basic Info */}
          <Card icon={<Layers className="h-4 w-4 text-blue-400" />} title="Basic Info">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <Field label="Task Group" value={task.taskGroup?.name} />
              <Field label="Created By" value={task.creator?.fullName} />
              <Field label="Owner" value={task.assignment?.intern?.fullName} />
              <Field label="Created" value={fmtDate(task.createdAt)} />
              <Field label="Updated" value={fmtDate(task.updatedAt)} />
              <Field label="Attempts" value={task.assignment ? String(task.assignment.status) : "Unassigned"} />
            </div>
          </Card>

          {/* Card 2: Timeline */}
          <Card icon={<Calendar className="h-4 w-4 text-amber-400" />} title="Timeline">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Field label="Deadline" value={fmtDate(task.deadline)} accent />
              <Field label="Start Date" value={fmtDate(task.startDate)} />
              <Field label="Est. Days" value={task.estDays != null ? `${task.estDays} days` : "—"} />
              <Field label="Phase" value={task.phase} />
              <Field label="Module" value={task.module} />
            </div>
          </Card>

          {/* Card 3: Description & Criteria */}
          <Card icon={<FileText className="h-4 w-4 text-emerald-400" />} title="Description & Criteria">
            <div className="space-y-4">
              {task.description && (
                <div>
                  <Label>Description</Label>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{task.description}</p>
                </div>
              )}
              {task.acceptanceCriteria && (
                <div>
                  <Label>Acceptance Criteria</Label>
                  <div className="rounded-xl border border-border bg-slate-50/70 p-3 text-sm text-foreground leading-relaxed font-mono whitespace-pre-line dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                    {task.acceptanceCriteria}
                  </div>
                </div>
              )}
              {task.taskNotes && (
                <div>
                  <Label>Notes</Label>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-300 italic whitespace-pre-wrap">
                    {task.taskNotes}
                  </div>
                </div>
              )}
              {!task.description && !task.acceptanceCriteria && !task.taskNotes && (
                <p className="text-xs text-muted">No description, criteria, or notes.</p>
              )}
            </div>
          </Card>

          {/* Card 4: Dependencies */}
          {Boolean(
            (task.dependsOn && task.dependsOn.length > 0) ||
            (task.dependencies && task.dependencies.length > 0) ||
            task.recreatedTask
          ) && (
            <Card icon={<GitBranch className="h-4 w-4 text-purple-400" />} title="Dependencies">
              <div className="space-y-3">
                {Boolean(task.dependsOn && task.dependsOn.length > 0) && (
                  <div>
                    <Label>Depends On</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {task.dependsOn?.map((d) => (
                        <span key={d.id} className="inline-flex items-center gap-1 rounded-lg border border-border bg-slate-50 px-2 py-1 text-xs text-foreground dark:border-white/10 dark:bg-white/5">
                          <span className="font-mono text-muted">{d.code}</span>
                          <span>{d.title}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {Boolean(task.dependencies && task.dependencies.length > 0) && (
                  <div>
                    <Label>Depended By</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {task.dependencies?.map((d) => (
                        <span key={d.id} className="inline-flex items-center gap-1 rounded-lg border border-border bg-slate-50 px-2 py-1 text-xs text-foreground dark:border-white/10 dark:bg-white/5">
                          <span className="font-mono text-muted">{d.code}</span>
                          <span>{d.title}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {task.recreatedTask && (
                  <div>
                    <Label>Recreated From</Label>
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-2.5 py-1 text-xs">
                      <span className="font-mono text-cyan-400">{task.recreatedTask.code}</span>
                      <span className="text-foreground">{task.recreatedTask.title}</span>
                      {task.recreatedTask.assignment?.intern?.fullName && (
                        <span className="text-muted">({task.recreatedTask.assignment.intern.fullName})</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Card 5: Attachments */}
          {Boolean(task.attachments && task.attachments.length > 0) && (
            <Card icon={<Paperclip className="h-4 w-4 text-cyan-400" />} title={`Attachments (${task.attachments?.length ?? 0})`}>
              <div className="space-y-1.5">
                {task.attachments?.map((a) => (
                  <a
                    key={a.id}
                    href={a.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-white/5 transition group"
                  >
                    {getFileIcon(a.mimeType)}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground group-hover:text-primary-light transition">
                        {a.fileName}
                      </p>
                      <p className="text-xs text-muted">
                        {formatSize(a.fileSize)}{formatSize(a.fileSize) ? " · " : ""}{a.mimeType}
                      </p>
                    </div>
                    <Link className="h-3.5 w-3.5 shrink-0 text-muted opacity-0 group-hover:opacity-100 transition" />
                  </a>
                ))}
              </div>
            </Card>
          )}

          {/* Card 6: Assignment Detail */}
          {task.assignment && (
            <Card icon={<User className="h-4 w-4 text-indigo-400" />} title="Assignment">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Intern" value={task.assignment.intern?.fullName} />
                <Field label="Status" value={task.assignment.status.replace("_", " ")} />
                <Field label="Assigned At" value={fmtDate(task.assignment.assignedAt)} />
                <Field label="Updated At" value={fmtDate(task.assignment.updatedAt)} />
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ─── Helpers ─────────────────────────────────────────────── */

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/[0.02]">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, accent }: { label: string; value?: string | null; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-0.5">{label}</p>
      <p className={`text-sm ${accent ? "font-semibold text-amber-400" : "text-foreground"}`}>
        {value || "—"}
      </p>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">{children}</p>;
}

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
