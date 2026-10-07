"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Layers, GitBranch, Paperclip, FileText, Film, FileArchive, ImageIcon, User, Clock, ExternalLink, Send, MessageSquare, CheckCircle2, XCircle, Video, Sparkles, AlertTriangle, RotateCcw, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTask } from "@/hooks/task/useTask";
import { useTaskSubmissions } from "@/hooks/task-submission/useTaskSubmissions";
import { useUnblockTaskAssignment } from "@/hooks/task-assignment/useUnblockTaskAssignment";
import Spinner from "@/components/ui/Spinner";
import MetalCard from "@/components/ui/MetalCard";
import TaskAiRecommendationModal from "../TaskAiRecommendationModal";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

const priorityBadge: Record<string, string> = {
  HIGH: "border border-red-300 bg-red-100/80 text-red-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400",
  MEDIUM: "border border-amber-300 bg-amber-100/80 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400",
  LOW: "border border-emerald-300 bg-emerald-100/80 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400",
};

const statusBadge: Record<string, string> = {
  DONE: "border-emerald-300 bg-emerald-100/80 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400",
  IN_PROGRESS: "border-sky-300 bg-sky-100/80 text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400",
  REVIEW: "border-purple-300 bg-purple-100/80 text-purple-800 dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400",
  TODO: "border-slate-300 bg-slate-100/90 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400",
  BLOCKED: "border-rose-300 bg-rose-100/80 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400",
  PENDING_APPROVAL: "border-amber-300 bg-amber-100/80 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400",
  EXTENSION_PENDING: "border-amber-300 bg-amber-100/90 text-amber-800 font-bold dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-300",
  UNASSIGNED: "border-orange-300 bg-orange-100/80 text-orange-800 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400",
};

function getFileIcon(mime: string) {
  const t = mime.split("/")[0];
  if (t === "image") return <ImageIcon className="h-4 w-4 shrink-0 text-emerald-400" />;
  if (t === "video") return <Film className="h-4 w-4 shrink-0 text-cyan-400" />;
  if (mime.includes("zip") || mime.includes("rar") || mime.includes("7z")) return <FileArchive className="h-4 w-4 shrink-0 text-indigo-400" />;
  if (mime.includes("pdf") || mime.includes("document") || mime.includes("sheet")) return <FileText className="h-4 w-4 shrink-0 text-amber-400" />;
  return <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />;
}

function formatSize(bytes: number) {
  if (bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TaskDetailPage() {
  return (
    <ProtectedRoute requiredPermissions={["TASK_READ"]}>
      <TaskDetailContent />
    </ProtectedRoute>
  );
}

function TaskDetailContent() {
  const td = useTranslations("leader.tasks.detail");
  const t = useTranslations("leader.tasks");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading } = useTask(id);
  const task = data?.data;
  const [showAi, setShowAi] = useState(false);
  const unblockAssignment = useUnblockTaskAssignment();

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

  const { data: submissionsData } = useTaskSubmissions(
    task?.assignment?.id ? { assignmentId: task.assignment.id, sortBy: "attempt", order: "asc", limit: 50 } : undefined,
  );
  const submissions = submissionsData?.data ?? [];

  if (isLoading) {
    return <div className="flex items-center justify-center py-32"><Spinner size="lg" /></div>;
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-sm text-slate-400">{td("taskNotFound")}</p>
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm font-medium text-sky-400 hover:text-sky-300 transition">
          <ArrowLeft className="h-4 w-4" />{td("goBack")}
        </button>
      </div>
    );
  }

  return (
    <div className="max-auto space-y-6 pb-16 px-4">
      <button onClick={() => router.back()} className="group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition">
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />{td("backToTasks")}
      </button>

      <div className="border-b border-slate-800/80 pb-6">
        <div className="flex flex-wrap items-center gap-2.5 mb-3">
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">{task.code || "—"}</span>
          {task.priority && <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${priorityBadge[task.priority] ?? ""}`}>{task.priority}</span>}
          <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold border ${statusBadge[task.assignment?.status ?? "TODO"] ?? ""}`}>
            {getStatusLabel(task.assignment?.status ?? "TODO")}
          </span>
          {(!task.assignment || !task.assignment.internId) && (
            <button onClick={() => setShowAi(true)} className="ml-auto flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-400 hover:bg-sky-500/20 hover:border-sky-500/50 transition-all">
              <Sparkles className="h-3.5 w-3.5" />{td("aiAssign")}
            </button>
          )}
        </div>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white bg-clip-text">{task.title}</h1>
      </div>

      {task.assignment?.status === "DONE" && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <p className="text-sm font-semibold">{td("completedTaskReadOnly")}</p>
        </div>
      )}

      {showAi && <TaskAiRecommendationModal taskId={task.id} taskTitle={task.title} isAssigned={!!task.assignment?.internId} onClose={() => setShowAi(false)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card icon={<FileText className="h-4 w-4 text-emerald-400" />} title={td("descRequirements")}>
            <div className="space-y-6">
              {task.description && (
                <div className="space-y-2">
                  <Label>{td("detailedDesc")}</Label>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-900/20 p-3.5 rounded-xl border border-slate-800/50">{task.description}</p>
                </div>
              )}
              {task.acceptanceCriteria && (
                <div className="space-y-2">
                  <Label>{td("acceptanceCriteria")}</Label>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-emerald-400/90 leading-relaxed font-mono whitespace-pre-line shadow-inner">{task.acceptanceCriteria}</div>
                </div>
              )}
              {task.taskNotes && (
                <div className="space-y-2">
                  <Label>{td("importantNotes")}</Label>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-300/90 italic whitespace-pre-wrap">{task.taskNotes}</div>
                </div>
              )}
              {!task.description && !task.acceptanceCriteria && !task.taskNotes && (
                <p className="text-sm italic text-slate-500 text-center py-4">{td("noDetails")}</p>
              )}
            </div>
          </Card>

          {Boolean(
            (task.dependsOn && task.dependsOn.length > 0) ||
            (task.dependencies && task.dependencies.length > 0) ||
            task.recreatedTask
          ) && (
            <Card icon={<GitBranch className="h-4 w-4 text-purple-400" />} title={td("taskRelations")}>
              <div className="space-y-4">
                {Boolean(task.dependsOn && task.dependsOn.length > 0) && (
                  <div className="space-y-2">
                    <Label>{td("dependsOn")}</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {task.dependsOn?.map((d) => (
                        <div key={d.id} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-2.5 text-xs text-slate-300">
                          <span className="font-mono font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">{d.code}</span>
                          <span className="truncate font-medium">{d.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {Boolean(task.dependencies && task.dependencies.length > 0) && (
                  <div className="space-y-2">
                    <Label>{td("dependedBy")}</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {task.dependencies?.map((d) => (
                        <div key={d.id} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-2.5 text-xs text-slate-300">
                          <span className="font-mono font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">{d.code}</span>
                          <span className="truncate font-medium">{d.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {task.recreatedTask && (
                  <div className="space-y-2">
                    <Label>{td("recreatedFrom")}</Label>
                    <div className="inline-flex items-center flex-wrap gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs">
                      <span className="font-mono font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">{task.recreatedTask.code}</span>
                      <span className="text-slate-200 font-medium">{task.recreatedTask.title}</span>
                      {task.recreatedTask.assignment?.intern?.fullName && (
                        <span className="text-slate-400 font-normal">({td("assignedTo")} {task.recreatedTask.assignment.intern.fullName})</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {Boolean(task.attachments && task.attachments.length > 0) && (
            <Card icon={<Paperclip className="h-4 w-4 text-cyan-400" />} title={td("attachments", { count: task.attachments?.length ?? 0 })}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {task.attachments?.map((a) => (
                  <a key={a.id} href={a.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-slate-800/60 bg-slate-900/30 p-3 hover:bg-slate-800/50 hover:border-slate-700 transition group">
                    <div className="p-2 rounded-lg bg-slate-950 shadow-inner">{getFileIcon(a.mimeType)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-200 group-hover:text-sky-400 transition">{a.fileName}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{formatSize(a.fileSize)}{formatSize(a.fileSize) ? " · " : ""}{a.mimeType.split("/")[1] || a.mimeType}</p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-500 opacity-0 group-hover:opacity-100 group-hover:text-sky-400 transition-all duration-200" />
                  </a>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-5 lg:sticky lg:top-6">
          <Card icon={<Clock className="h-4 w-4 text-amber-400" />} title={td("timeline")}>
            <div className="space-y-4">
              <Field label={td("deadline")} value={fmtDate(task.deadline)} accent />
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/60">
                <Field label={td("startDate")} value={fmtDate(task.startDate)} />
                <Field label={td("estDays")} value={task.estDays != null ? td("days", { n: task.estDays }) : "—"} />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/60">
                <Field label={td("phase")} value={task.phase} />
                <Field label={td("module")} value={task.module} />
              </div>
            </div>
          </Card>

          {task.assignment && (
            <Card icon={<User className="h-4 w-4 text-indigo-400" />} title={td("assignmentDetail")}>
              <div className="space-y-4">
                <Field label={td("assignee")} value={task.assignment.intern?.fullName} highlight />
                <Field label={td("support")} value={task.assignment.support?.fullName} />
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/60">
                  <Field label={td("assignedAt")} value={fmtDate(task.assignment.assignedAt)} />
                  <Field label={td("lastUpdate")} value={fmtDate(task.assignment.updatedAt)} />
                </div>
                {task.assignment.status === "BLOCKED" && (
                  <div className="space-y-3 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">{td("blockedReason")}</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">
                          {task.assignment.blockedReason || td("blockedReasonMissing")}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const assignment = task.assignment;
                        if (!assignment) return;
                        unblockAssignment.mutate(assignment.id);
                      }}
                      disabled={unblockAssignment.isPending}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {unblockAssignment.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                      {td("resumeBlockedTask")}
                    </button>
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card icon={<Layers className="h-4 w-4 text-sky-400" />} title={td("systemProps")}>
            <div className="space-y-4">
              <Field label={td("taskGroup")} value={task.taskGroup?.name} />
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/60">
                <Field label={td("createdBy")} value={task.creator?.fullName} />
                <Field label={td("taskCode")} value={task.code} mono />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/60">
                <Field label={td("systemCreated")} value={fmtDate(task.createdAt)} />
                <Field label={td("systemUpdated")} value={fmtDate(task.updatedAt)} />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {submissions.length > 0 && (
        <Card icon={<MessageSquare className="h-4 w-4 text-purple-400" />} title={td("submissionHistory", { count: submissions.length })}>
          <div className="space-y-4">
            {submissions.map((sub) => (
              <div key={sub.id} className={`rounded-xl border p-4 ${sub.reviewStatus === "APPROVED" ? "border-emerald-500/20 bg-emerald-500/5" : sub.reviewStatus === "REJECTED" ? "border-rose-500/20 bg-rose-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-0.5 text-xs font-mono font-bold text-slate-300"><Send className="h-3 w-3" />#{sub.attempt}</span>
                    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase ${sub.reviewStatus === "APPROVED" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : sub.reviewStatus === "REJECTED" ? "border-rose-500/30 bg-rose-500/10 text-rose-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400"}`}>
                      {sub.reviewStatus === "APPROVED" && <CheckCircle2 className="h-3 w-3" />}
                      {sub.reviewStatus === "REJECTED" && <XCircle className="h-3 w-3" />}
                      {sub.reviewStatus === "PENDING" && <Clock className="h-3 w-3" />}
                      {sub.reviewStatus}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">{new Date(sub.submittedAt).toLocaleString("vi-VN")}</span>
                </div>
                <div className="space-y-2">
                  {sub.note && (
                    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{td("internsNote")}</p>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap">{sub.note}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3">
                    {sub.prLink && <a href={sub.prLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition"><ExternalLink className="h-3 w-3" />{td("pullRequest")}</a>}
                    {sub.videoDemo && <a href={sub.videoDemo} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition"><Video className="h-3 w-3" />{td("videoDemo")}</a>}
                  </div>
                  {sub.attachments && sub.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {sub.attachments.map((att) => (
                        <a key={att.id} href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/40 px-2 py-1 text-xs text-slate-400 hover:text-sky-400 hover:border-slate-700 transition">
                          {getFileIcon(att.mimeType)}<span className="truncate max-w-[120px]">{att.fileName}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                {sub.reviewStatus !== "PENDING" && (
                  <div className={`mt-3 rounded-lg border p-3 ${sub.reviewStatus === "APPROVED" ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5"}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{td("leadersReview")}</span>
                      {sub.reviewer && <span className="text-[10px] text-slate-400">{td("by", { name: sub.reviewer.fullName })}</span>}
                      {sub.reviewedAt && <span className="text-[10px] text-slate-600 ml-auto">{new Date(sub.reviewedAt).toLocaleString("vi-VN")}</span>}
                    </div>
                    {sub.reviewComment ? (
                      <p className={`text-sm italic ${sub.reviewStatus === "APPROVED" ? "text-emerald-300/90" : "text-rose-300/90"}`}>{sub.reviewComment}</p>
                    ) : (
                      <p className="text-xs text-slate-500 italic">{sub.reviewStatus === "APPROVED" ? td("approvedNoComment") : td("rejectedNoComment")}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {task.assignment && submissions.length === 0 && (
        <Card icon={<Send className="h-4 w-4 text-slate-500" />} title={td("submissionHistory", { count: 0 })}>
          <p className="text-sm text-slate-500 italic text-center py-4">{td("noSubmissions")}</p>
        </Card>
      )}
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <MetalCard><div className="p-5"><div className="mb-4 flex items-center gap-2"><div className="p-1.5 rounded-lg bg-slate-950/40 border border-slate-800/60 shadow-inner">{icon}</div><h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">{title}</h3></div>{children}</div></MetalCard>;
}

function Field({ label, value, accent, highlight, mono }: { label: string; value?: string | null; accent?: boolean; highlight?: boolean; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-sm tracking-wide truncate ${mono ? "font-mono text-xs text-slate-400" : ""} ${accent ? "font-bold text-rose-400 bg-rose-500/5 px-2 py-1 rounded border border-rose-500/10 inline-block mt-1" : ""} ${highlight ? "font-semibold text-sky-400" : "text-slate-200"}`}>{value || "—"}</p>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{children}</p>;
}

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
