"use client";

import { useState, useContext, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Pencil, Loader2, Paperclip, X, Link, ImageIcon, Film, FileArchive, FileText, Trash2, CheckCircle2, AlertCircle, UserCheck, Users } from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Select from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { extractTaskGroups } from "@/types/task-group";
import { useUpdateTask } from "@/hooks/task/useUpdateTask";
import { useTask } from "@/hooks/task/useTask";
import { useTaskGroups } from "@/hooks/task-group/useTaskGroups";
import { useInterns } from "@/hooks/intern/useInterns";
import { useAssignTask } from "@/hooks/task-assignment/useAssignTask";
import { useLookupAssignmentIntern } from "@/hooks/intern/useLookupAssignmentIntern";
import { useUnassignTask } from "@/hooks/task-assignment/useUnassignTask";
import { useDeleteTaskAttachment } from "@/hooks/task-attachment/useDeleteTaskAttachment";
import { useUploadTaskAttachment } from "@/hooks/task-attachment/useUploadTaskAttachment";
import { taskAttachmentService } from "@/services/task-attachment.service";
import { AuthContext } from "@/contexts/AuthContext";
import type { UpdateTaskPayload } from "@/types/task";
import { UPLOAD_LIMITS_MB } from "@/lib/upload-policy";

const TODAY = new Date().toISOString().split("T")[0];
const MAX_FILES = 10;
const MAX_LINKS = 10;
const MAX_FILE_SIZE = UPLOAD_LIMITS_MB.taskAttachment * 1024 * 1024;
const BATCH_SIZE = 3;

const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip", "application/x-zip-compressed", "application/x-rar-compressed", "application/vnd.rar", "application/x-7z-compressed",
  "video/mp4", "video/webm",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel",
]);

type FileCategory = "image" | "video" | "archive" | "doc" | "other";
type ItemStatus = "pending" | "uploading" | "success" | "error";

function getFileCategory(mimeType: string): FileCategory {
  const t = mimeType.split("/")[0];
  if (t === "image") return "image";
  if (t === "video") return "video";
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z")) return "archive";
  if (mimeType.includes("pdf") || mimeType.includes("msword") || mimeType.includes("officedocument") || mimeType.includes("excel")) return "doc";
  return "other";
}

function getFileIcon(cat: FileCategory) { return { image: ImageIcon, video: Film, archive: FileArchive, doc: FileText, other: Paperclip }[cat]; }
function getFileColor(cat: FileCategory) { return { image: "text-emerald-400", video: "text-cyan-400", archive: "text-indigo-400", doc: "text-amber-400", other: "text-muted" }[cat]; }

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props { taskId: string; onClose?: () => void; onCloseModal?: () => void; }
interface FileItem { id: number; file: File; name: string; size: number; mimeType: string; }
interface LinkItem { id: number; fileName: string; fileUrl: string; }

let nextId = 0;

export default function TaskEditModal({ taskId, onClose, onCloseModal }: Props) {
  const tm = useTranslations("leader.tasks.editModal");
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const uploadAttachment = useUploadTaskAttachment();
  const deleteAttachment = useDeleteTaskAttachment();
  const assignTask = useAssignTask();
  const lookupAssignmentIntern = useLookupAssignmentIntern();
  const unassignTask = useUnassignTask();
  const auth = useContext(AuthContext);
  const currentUserId = auth?.state.user?.id;

  const { data: taskData, isLoading } = useTask(taskId);
  const task = taskData?.data;

  const { data: taskGroupsData } = useTaskGroups();
  const taskGroups = useMemo(() => extractTaskGroups(taskGroupsData?.data), [taskGroupsData]);

  const { data: myInternsData } = useInterns({ leaderId: currentUserId });
  const myInterns = myInternsData?.data ?? [];

  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkErr, setLinkErr] = useState("");
  const [linkItems, setLinkItems] = useState<LinkItem[]>([]);
  const [fileStatuses, setFileStatuses] = useState<Record<number, ItemStatus>>({});
  const [linkStatuses, setLinkStatuses] = useState<Record<number, ItemStatus>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [assignMode, setAssignMode] = useState<"keep" | "none" | "my" | "other">("keep");
  const [selectedInternId, setSelectedInternId] = useState<string>("");
  const [otherInternEmail, setOtherInternEmail] = useState("");
  const [otherInternEmailError, setOtherInternEmailError] = useState("");

  const handleOtherInternLookup = async () => {
    const normalizedEmail = otherInternEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setSelectedInternId("");
      setOtherInternEmailError(
        tm.has("invalidInternEmail")
          ? tm("invalidInternEmail")
          : "Enter a valid intern email.",
      );
      lookupAssignmentIntern.reset();
      return;
    }

    setOtherInternEmailError("");
    setSelectedInternId("");
    lookupAssignmentIntern.reset();
    try {
      const result = await lookupAssignmentIntern.mutateAsync(normalizedEmail);
      setOtherInternEmail(result.data.email);
      setSelectedInternId(result.data.id);
    } catch {
      setOtherInternEmailError(
        tm.has("otherTeamInternNotFound")
          ? tm("otherTeamInternNotFound")
          : "No active intern from another team matches this email.",
      );
    }
  };

  const addLink = () => {
    const trimmed = linkUrl.trim();
    if (!trimmed) return;
    try { new URL(trimmed); } catch { setLinkErr(tm("invalidUrl")); return; }
    if (linkItems.length >= MAX_LINKS) { toast.error(tm("maxLinks", { n: MAX_LINKS })); return; }
    if (linkItems.some((l) => l.fileUrl === trimmed)) { toast.error(tm("duplicateUrl")); return; }
    setLinkErr("");
    const fileName = trimmed.split("/").pop()?.split("?")[0] || "link";
    setLinkItems((prev) => [...prev, { id: nextId++, fileName, fileUrl: trimmed }]);
    setLinkUrl("");
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const valid: FileItem[] = [];
    for (const file of selected) {
      if (fileItems.length + valid.length >= MAX_FILES) { toast.error(tm("maxFiles", { n: MAX_FILES })); break; }
      if (file.size > MAX_FILE_SIZE) { toast.error(tm("exceedsLimit", { name: file.name, limit: UPLOAD_LIMITS_MB.taskAttachment })); continue; }
      if (!ALLOWED_TYPES.has(file.type)) { toast.error(tm("unsupportedType", { name: file.name })); continue; }
      if (fileItems.some((f) => f.name === file.name) || valid.some((f) => f.name === file.name)) { toast.error(tm("duplicateFile", { name: file.name })); continue; }
      valid.push({ id: nextId++, file, name: file.name, size: file.size, mimeType: file.type });
    }
    if (valid.length > 0) setFileItems((prev) => [...prev, ...valid]);
    e.target.value = "";
  };

  const removeFile = (id: number) => {
    setFileItems((prev) => prev.filter((f) => f.id !== id));
    setFileStatuses((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };

  const removeLink = (id: number) => {
    setLinkItems((prev) => prev.filter((l) => l.id !== id));
    setLinkStatuses((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<UpdateTaskPayload>({
    mode: "onBlur",
    values: task ? {
      title: task.title, description: task.description ?? "",
      deadline: task.deadline ? task.deadline.split("T")[0] : "",
      priority: task.priority ?? undefined, code: task.code ?? "",
      startDate: task.startDate ? task.startDate.split("T")[0] : "",
      estDays: task.estDays ?? undefined, phase: task.phase ?? "",
      module: task.module ?? "", acceptanceCriteria: task.acceptanceCriteria ?? "",
      taskNotes: task.taskNotes ?? "", taskGroupId: task.taskGroupId ?? undefined,
    } : undefined,
  });

  const deadlineVal = watch("deadline");

  useEffect(() => {
    register("startDate", {
      validate: (v) => {
        if (!v) return true;
        if (deadlineVal && v > deadlineVal) return tm("startDateBeforeDeadline");
        return true;
      },
    });
    register("deadline", {
      required: tm("deadlineRequired"),
      validate: (v) => !v || v >= TODAY || tm("deadlinePast"),
    });
    register("priority", {
      validate: (v) => !v || ["HIGH", "MEDIUM", "LOW"].includes(v) || tm("invalidPriority"),
    });
    register("taskGroupId");
  }, [register, deadlineVal, tm]);

  const onSubmit = async (data: UpdateTaskPayload) => {
    if (task?.assignment?.status === "DONE") {
      toast.error(tm("completedTaskReadOnly"));
      return;
    }

    const payload: UpdateTaskPayload = { ...data, estDays: data.estDays || undefined, startDate: data.startDate || undefined, taskGroupId: data.taskGroupId || undefined, priority: data.priority || undefined, code: data.code || undefined, description: data.description || undefined, phase: data.phase || undefined, module: data.module || undefined, acceptanceCriteria: data.acceptanceCriteria || undefined, taskNotes: data.taskNotes || undefined };
    try {
      setIsUploading(true);
      await updateTask.mutateAsync({ id: taskId, payload });
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });

      const filesToUpload = fileItems.filter((f) => fileStatuses[f.id] !== "success");
      const linksToUpload = linkItems.filter((l) => linkStatuses[l.id] !== "success");

      setFileStatuses((prev) => {
        const next = { ...prev };
        filesToUpload.forEach((f) => (next[f.id] = "uploading"));
        return next;
      });
      setLinkStatuses((prev) => {
        const next = { ...prev };
        linksToUpload.forEach((l) => (next[l.id] = "uploading"));
        return next;
      });

      let uploadFailed = false;

      if (filesToUpload.length > 0) {
        for (let i = 0; i < filesToUpload.length; i += BATCH_SIZE) {
          const batch = filesToUpload.slice(i, i + BATCH_SIZE);
          for (const f of batch) {
            try {
              await uploadAttachment.mutateAsync({ taskId, file: f.file });
              setFileStatuses((prev) => ({ ...prev, [f.id]: "success" }));
            } catch {
              setFileStatuses((prev) => ({ ...prev, [f.id]: "error" }));
              uploadFailed = true;
            }
          }
        }
      }

      if (linksToUpload.length > 0) {
        for (const link of linksToUpload) {
          try {
            await taskAttachmentService.createTaskAttachmentLink(taskId, link.fileName, link.fileUrl);
            setLinkStatuses((prev) => ({ ...prev, [link.id]: "success" }));
          } catch {
            setLinkStatuses((prev) => ({ ...prev, [link.id]: "error" }));
            uploadFailed = true;
          }
        }
      }

      if (assignMode === "none" && task?.assignment) {
        await unassignTask.mutateAsync(taskId);
      }
      else if (selectedInternId) {
        const internEmail = assignMode === "other"
          ? otherInternEmail.trim().toLowerCase()
          : undefined;
        await assignTask.mutateAsync({
          taskId,
          payload: { internId: selectedInternId, internEmail },
        });
      }

      queryClient.invalidateQueries({ queryKey: ["tasks"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["task-attachments", taskId] });
      
      if (!uploadFailed) {
        onClose?.();
        onCloseModal?.();
      } else {
        toast.error("Some attachments failed to upload. Please try again.");
      }
    } catch (error) {
      if (!axios.isAxiosError(error)) {
        toast.error("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="md" /></div>;
  if (!task) return <p className="py-8 text-center text-sm text-muted">{tm("taskNotFound")}</p>;
  if (task.assignment?.status === "DONE") {
    return (
      <div className="space-y-4 py-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="h-6 w-6 text-emerald-400" />
        </div>
        <p className="text-sm font-semibold text-emerald-300">
          {tm("completedTaskReadOnly")}
        </p>
        <div className="pt-2">
          <Button variant="glass" onClick={() => (onCloseModal ? onCloseModal() : onClose ? onClose() : null)}>
            {tm("cancel")}
          </Button>
        </div>
      </div>
    );
  }

  const isPending = updateTask.isPending || isUploading;
  const existingAttachments = task.attachments ?? [];

  const inputClass = (name: keyof UpdateTaskPayload, extra = "") =>
    `w-full h-[42px] sm:h-[46px] rounded-xl border px-4 text-xs sm:text-sm text-foreground placeholder:text-muted focus:outline-none ${errors[name] ? "border-red-400/60 focus:border-red-400" : "border-border bg-card focus:border-primary-light/40"} ${extra}`;

  const ErrorMsg = ({ name }: { name: keyof UpdateTaskPayload }) =>
    errors[name] ? <p className="mt-1 text-xs text-red-400">{errors[name]?.message}</p> : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10"><Pencil className="h-5 w-5 text-amber-400" /></div>
        <div><h3 className="text-lg font-semibold metal-text">{tm("title")}</h3><p className="text-sm text-muted">{task.title}</p></div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs sm:text-sm font-medium text-foreground">{tm("titleLabel")} <span className="text-red-400">*</span></label>
            <input type="text" placeholder={tm("titlePlaceholder")} {...register("title", { required: tm("titleRequired"), maxLength: { value: 255, message: tm("titleMaxLength") } })} className={inputClass("title")} />
            <ErrorMsg name="title" />
          </div>
          <div>
            <label className="mb-1 block text-xs sm:text-sm font-medium text-foreground">{tm("deadline")} <span className="text-red-400">*</span></label>
            <DatePicker
              value={watch("deadline") ?? ""}
              minDate={watch("startDate") || TODAY}
              placeholder="YYYY-MM-DD"
              onChange={(d) => setValue("deadline", d, { shouldValidate: true })}
              onClear={() => setValue("deadline", "", { shouldValidate: true })}
            />
            <ErrorMsg name="deadline" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs sm:text-sm font-medium text-foreground">{tm("code")}</label>
            <input type="text" placeholder={tm("codePlaceholder")} {...register("code", { pattern: { value: /^[A-Za-z0-9._-]*$/, message: tm("codePattern") }, maxLength: { value: 50, message: tm("codeMaxLength") } })} className={inputClass("code")} />
            <ErrorMsg name="code" />
          </div>
          <div>
            <label className="mb-1 block text-xs sm:text-sm font-medium text-foreground">{tm("priority")}</label>
            <Select
              value={watch("priority") ?? ""}
              onChange={(v) => setValue("priority", (v || undefined) as UpdateTaskPayload["priority"], { shouldValidate: true })}
              placeholder={tm("selectPriority")}
              options={[
                { value: "", label: tm("selectPriority") },
                { value: "HIGH", label: tm("priorityHigh") },
                { value: "MEDIUM", label: tm("priorityMedium") },
                { value: "LOW", label: tm("priorityLow") },
              ]}
            />
            <ErrorMsg name="priority" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs sm:text-sm font-medium text-foreground">{tm("startDate")}</label>
            <DatePicker
              value={watch("startDate") ?? ""}
              placeholder="YYYY-MM-DD"
              onChange={(d) => setValue("startDate", d, { shouldValidate: true })}
              onClear={() => setValue("startDate", "", { shouldValidate: true })}
            />
            <ErrorMsg name="startDate" />
          </div>
          <div>
            <label className="mb-1 block text-xs sm:text-sm font-medium text-foreground">{tm("estDays")}</label>
            <input type="number" step="any" min={0.1} placeholder={tm("estDaysPlaceholder")} {...register("estDays", { valueAsNumber: true, min: { value: 0.1, message: tm("estDaysMin") }, max: { value: 365, message: tm("estDaysMax") } })} className={inputClass("estDays")} />
            <ErrorMsg name="estDays" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs sm:text-sm font-medium text-foreground">{tm("phase")}</label>
            <input type="text" placeholder={tm("phasePlaceholder")} {...register("phase", { maxLength: { value: 100, message: tm("phaseMaxLength") } })} className={inputClass("phase")} />
            <ErrorMsg name="phase" />
          </div>
          <div>
            <label className="mb-1 block text-xs sm:text-sm font-medium text-foreground">{tm("module")}</label>
            <input type="text" placeholder={tm("modulePlaceholder")} {...register("module", { maxLength: { value: 100, message: tm("moduleMaxLength") } })} className={inputClass("module")} />
            <ErrorMsg name="module" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs sm:text-sm font-medium text-foreground">{tm("taskGroup")}</label>
          <Select
            value={watch("taskGroupId") ?? ""}
            onChange={(v) => setValue("taskGroupId", v || undefined, { shouldValidate: true })}
            placeholder={tm("noGroup")}
            options={[
              { value: "", label: tm("noGroup") },
              ...taskGroups.map((tg) => ({ value: tg.id, label: tg.name })),
            ]}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">{tm("description")}</label>
          <textarea rows={2} placeholder={tm("descriptionPlaceholder")} {...register("description", { maxLength: { value: 2000, message: tm("descriptionMaxLength") } })} className={inputClass("description", "resize-none")} />
          <ErrorMsg name="description" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">{tm("acceptanceCriteria")}</label>
            <textarea rows={2} placeholder={tm("acceptanceCriteriaPlaceholder")} {...register("acceptanceCriteria", { maxLength: { value: 2000, message: tm("criteriaMaxLength") } })} className={inputClass("acceptanceCriteria", "resize-none")} />
            <ErrorMsg name="acceptanceCriteria" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">{tm("notes")}</label>
            <textarea rows={2} placeholder={tm("notesPlaceholder")} {...register("taskNotes", { maxLength: { value: 2000, message: tm("notesMaxLength") } })} className={inputClass("taskNotes", "resize-none")} />
            <ErrorMsg name="taskNotes" />
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">{tm("attachments")}</label>
            {(existingAttachments.length > 0 || fileItems.length > 0 || linkItems.length > 0) && (
              <span className="text-xs text-muted">
                {existingAttachments.length > 0 && `${tm("existingLabel", { n: existingAttachments.length })}`}
                {existingAttachments.length > 0 && (fileItems.length > 0 || linkItems.length > 0) && ", "}
                {fileItems.length > 0 && tm("newFiles", { n: fileItems.length, plural: fileItems.length > 1 ? "s" : "" })}
                {(existingAttachments.length > 0 || fileItems.length > 0) && linkItems.length > 0 && ", "}
                {linkItems.length > 0 && tm("newLinks", { n: linkItems.length, plural: linkItems.length > 1 ? "s" : "" })}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {existingAttachments.length > 0 && (
              <div className="space-y-1">
                {existingAttachments.map((a) => {
                  const cat = getFileCategory(a.mimeType); const Icon = getFileIcon(cat); const color = getFileColor(cat);
                  return (
                    <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-slate-50/70 p-2.5 group dark:border-white/10 dark:bg-white/5">
                      <Icon className={`h-5 w-5 shrink-0 ${color}`} />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm text-foreground">{a.fileName}</p><p className="text-xs text-muted">{formatFileSize(a.fileSize)}</p></div>
                      <button type="button" onClick={() => deleteAttachment.mutate({ taskId, attachmentId: a.id })} disabled={isPending} className="shrink-0 rounded p-0.5 text-muted opacity-0 hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100 transition disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  );
                })}
              </div>
            )}

            {fileItems.length < MAX_FILES && (
              <div className="space-y-1">
                <input type="file" multiple disabled={isPending} onChange={handleFilesChange} className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary-main/10 file:px-3 file:py-1 file:text-xs file:text-primary-light file:cursor-pointer focus:border-primary-light/40 focus:outline-none disabled:opacity-50" />
                <p className="text-[11px] text-zinc-500">
                  Up to {MAX_FILES} files, {UPLOAD_LIMITS_MB.taskAttachment} MB each.
                </p>
              </div>
            )}
            {fileItems.length >= MAX_FILES && (
              <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-300">{tm("fileLimitReached", { max: MAX_FILES })}</p>
            )}

            {linkItems.length < MAX_LINKS && (
              <div className="flex gap-2">
                <input type="url" value={linkUrl} disabled={isPending} onChange={(e) => { setLinkUrl(e.target.value); if (linkErr) setLinkErr(""); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }} placeholder={tm("linkPlaceholder")} className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary-light/40 focus:outline-none disabled:opacity-50" />
                <Button type="button" variant="glass" size="sm" onClick={addLink} disabled={!linkUrl.trim() || isPending}><Link className="h-3 w-3" />{tm("add")}</Button>
              </div>
            )}
            {linkErr && <p className="text-xs text-red-400">{linkErr}</p>}

            {(fileItems.length > 0 || linkItems.length > 0) && (
              <div className="mt-3 space-y-1.5">
                {(fileItems.length + linkItems.length > 3 && !isPending) && (
                  <button type="button" onClick={() => { setFileItems([]); setLinkItems([]); setFileStatuses({}); setLinkStatuses({}); }} className="mb-1 text-xs text-muted hover:text-red-400 transition-colors">{tm("clearAllNew")}</button>
                )}
                {fileItems.map((f) => {
                  const cat = getFileCategory(f.mimeType); const Icon = getFileIcon(cat); const color = getFileColor(cat); const status = fileStatuses[f.id] ?? "pending";
                  return (
                    <div key={f.id} className="flex items-center gap-3 rounded-xl border border-border bg-slate-50/70 p-2.5 group dark:border-white/10 dark:bg-white/5">
                      <Icon className={`h-5 w-5 shrink-0 ${color}`} />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm text-foreground">{f.name}</p><p className="text-xs text-muted">{formatFileSize(f.size)}</p></div>
                      <div className="shrink-0">{status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-info" />}{status === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}{status === "error" && <AlertCircle className="h-4 w-4 text-red-400" />}</div>
                      {!isPending && <button type="button" onClick={() => removeFile(f.id)} className="shrink-0 rounded p-0.5 text-muted hover:bg-slate-200 dark:hover:bg-white/10 hover:text-red-400"><X className="h-3.5 w-3.5" /></button>}
                    </div>
                  );
                })}
                {linkItems.map((l) => {
                  const status = linkStatuses[l.id] ?? "pending"; const domain = (() => { try { return new URL(l.fileUrl).hostname; } catch { return ""; } })();
                  return (
                    <div key={l.id} className="flex items-center gap-3 rounded-xl border border-border bg-slate-50/70 p-2.5 group dark:border-white/10 dark:bg-white/5">
                      <Link className="h-5 w-5 shrink-0 text-blue-400" />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm text-foreground">{l.fileName}</p><p className="truncate text-xs text-muted">{domain}</p></div>
                      <div className="shrink-0">{status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-info" />}{status === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}{status === "error" && <AlertCircle className="h-4 w-4 text-red-400" />}</div>
                      {!isPending && <button type="button" onClick={() => removeLink(l.id)} className="shrink-0 rounded p-0.5 text-muted hover:bg-slate-200 dark:hover:bg-white/10 hover:text-red-400"><X className="h-3.5 w-3.5" /></button>}
                    </div>
                  );
                })}
              </div>
            )}

            {existingAttachments.length === 0 && fileItems.length === 0 && linkItems.length === 0 && (
              <p className="mt-2 text-xs text-muted italic">{tm("noAttachments")}</p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">{tm("assignToIntern")}</label>
          {task.assignment ? (
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5">
              <UserCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="flex-1 text-sm text-foreground">{tm("currentlyAssigned")} <span className="font-medium">{task.assignment.intern?.fullName ?? tm("unknown")}</span></span>
              <button type="button" onClick={() => { setAssignMode("none"); setSelectedInternId(""); }} className="rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition">{tm("remove")}</button>
            </div>
          ) : (
            <p className="mb-2 text-xs text-muted italic">{tm("notAssignedYet")}</p>
          )}

          <div className="flex gap-1.5 mb-2">
            {(["keep", "my", "other"] as const).map((mode) => {
              if (mode === "keep" && !task.assignment) return null;
              return (
                <button key={mode} type="button" onClick={() => {
                  setAssignMode(mode);
                  setSelectedInternId("");
                  setOtherInternEmail("");
                  setOtherInternEmailError("");
                  lookupAssignmentIntern.reset();
                }} disabled={isPending}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${assignMode === mode ? "bg-primary-main/20 text-primary-light border border-primary-light/30" : "bg-white/5 text-muted border border-white/5 hover:bg-white/10"}`}>
                  {mode === "keep" && tm("keepCurrent")}
                  {mode === "my" && <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" />{tm("myTeam")}</span>}
                  {mode === "other" && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{tm("otherTeams")}</span>}
                </button>
              );
            })}
          </div>

          {assignMode === "my" && (
            <Select
              value={selectedInternId}
              onChange={(val) => setSelectedInternId(val)}
              disabled={isPending}
              placeholder={tm("selectYourIntern")}
              options={[
                { value: "", label: tm("selectYourIntern") },
                ...myInterns.map((intern) => ({ value: intern.id, label: intern.fullName })),
              ]}
            />
          )}
          {assignMode === "other" && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={otherInternEmail}
                  onChange={(event) => {
                    setOtherInternEmail(event.target.value);
                    setSelectedInternId("");
                    setOtherInternEmailError("");
                    lookupAssignmentIntern.reset();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleOtherInternLookup();
                    }
                  }}
                  placeholder={
                    tm.has("otherTeamEmailPlaceholder")
                      ? tm("otherTeamEmailPlaceholder")
                      : "Enter the intern's exact email..."
                  }
                  disabled={isPending || lookupAssignmentIntern.isPending}
                  className="min-w-0 flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary-light/40 focus:outline-none disabled:opacity-50"
                />
                <Button type="button" variant="glass" size="md" onClick={() => void handleOtherInternLookup()} disabled={isPending || lookupAssignmentIntern.isPending}>
                  {lookupAssignmentIntern.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : tm.has("checkEmail") ? (
                    tm("checkEmail")
                  ) : (
                    "Check"
                  )}
                </Button>
              </div>
              {otherInternEmailError && <p className="text-xs text-red-400">{otherInternEmailError}</p>}
              {selectedInternId && lookupAssignmentIntern.data?.data && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                  <p className="text-sm font-medium text-emerald-300">{lookupAssignmentIntern.data.data.fullName}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {tm.has("internLeader")
                      ? tm("internLeader", {
                          name:
                            lookupAssignmentIntern.data.data.leader.fullName ||
                            lookupAssignmentIntern.data.data.leader.email,
                        })
                      : `Leader: ${lookupAssignmentIntern.data.data.leader.fullName || lookupAssignmentIntern.data.data.leader.email}`}
                  </p>
                </div>
              )}
              {!selectedInternId && !otherInternEmailError && (
                <p className="text-xs text-muted">
                  {tm.has("verifyOtherTeamIntern")
                    ? tm("verifyOtherTeamIntern")
                    : "Enter the exact email to verify the intern and their leader."}
                </p>
              )}
            </div>
          )}
          {assignMode === "my" && myInterns.length === 0 && (
            <p className="text-xs text-muted italic">{tm("noInternsAvailable")}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="glass" size="md" disabled={isPending} onClick={onCloseModal}>{tm("cancel")}</Button>
          <Button type="submit" variant="primary" size="md" isLoading={isPending} disabled={isPending || (assignMode === "other" && !selectedInternId)}>
            {!isPending && <Pencil className="h-4 w-4 mr-2" />}{tm("saveChanges")}
          </Button>
        </div>
      </form>
    </div>
  );
}
