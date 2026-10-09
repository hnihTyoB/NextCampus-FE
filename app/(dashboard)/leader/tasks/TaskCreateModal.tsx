"use client";

import { useState, useContext, useRef, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Plus,
  Loader2,
  Paperclip,
  X,
  Link,
  ImageIcon,
  Film,
  FileArchive,
  FileText,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Users,
  Clock,
} from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { extractTaskGroups } from "@/types/task-group";
import { useCreateTask } from "@/hooks/task/useCreateTask";
import { useTaskGroups } from "@/hooks/task-group/useTaskGroups";
import { useInterns } from "@/hooks/intern/useInterns";
import { useCreateTaskAssignment } from "@/hooks/task-assignment/useCreateTaskAssignment";
import { useLookupAssignmentIntern } from "@/hooks/intern/useLookupAssignmentIntern";
import { taskAttachmentService } from "@/services/task-attachment.service";
import { AuthContext } from "@/contexts/AuthContext";
import type { CreateTaskPayload } from "@/types/task";
import { UPLOAD_LIMITS_MB } from "@/lib/upload-policy";

const TODAY = new Date().toISOString().split("T")[0];
const MAX_FILES = 10;
const MAX_LINKS = 10;
const MAX_FILE_SIZE = UPLOAD_LIMITS_MB.taskAttachment * 1024 * 1024;
const BATCH_SIZE = 3;

function countWorkingDaysInclusive(startDate: string, endDate: string) {
  const parseDate = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  };

  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return 0;

  let count = 0;
  for (const date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

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

function getFileIcon(cat: FileCategory) {
  return { image: ImageIcon, video: Film, archive: FileArchive, doc: FileText, other: Paperclip }[cat];
}

function getFileColor(cat: FileCategory) {
  return { image: "text-emerald-400", video: "text-cyan-400", archive: "text-indigo-400", doc: "text-amber-400", other: "text-muted" }[cat];
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  onCloseModal?: () => void;
}

interface FileItem {
  id: number;
  file: File;
  name: string;
  size: number;
  mimeType: string;
}

interface LinkItem {
  id: number;
  fileName: string;
  fileUrl: string;
}

let nextId = 0;

export default function TaskCreateModal({ onCloseModal }: Props) {
  const tc = useTranslations("leader.tasks.createModal");
  const createTask = useCreateTask();
  const createAssignment = useCreateTaskAssignment();
  const lookupAssignmentIntern = useLookupAssignmentIntern();
  const queryClient = useQueryClient();
  const auth = useContext(AuthContext);
  const currentUserId = auth?.state.user?.id;

  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkErr, setLinkErr] = useState("");
  const [linkItems, setLinkItems] = useState<LinkItem[]>([]);
  const [fileStatuses, setFileStatuses] = useState<Record<number, ItemStatus>>({});
  const [linkStatuses, setLinkStatuses] = useState<Record<number, ItemStatus>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [assignMode, setAssignMode] = useState<"none" | "my" | "other">("none");
  const [selectedInternId, setSelectedInternId] = useState<string>("");
  const [otherInternEmail, setOtherInternEmail] = useState("");
  const [otherInternEmailError, setOtherInternEmailError] = useState("");
  const [step, setStep] = useState(1);
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);
  const submittingRef = useRef(false);

  // Only list the current leader's interns. Other teams require an exact email lookup.
  const { data: myInternsData } = useInterns({ leaderId: currentUserId });
  const myInterns = myInternsData?.data ?? [];

  const handleOtherInternLookup = async () => {
    const normalizedEmail = otherInternEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setSelectedInternId("");
      setOtherInternEmailError(tc("invalidInternEmail"));
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
      setOtherInternEmailError(tc("otherTeamInternNotFound"));
    }
  };

  const addLink = () => {
    const trimmed = linkUrl.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
    } catch {
      setLinkErr(tc("invalidUrl"));
      return;
    }
    if (linkItems.length >= MAX_LINKS) {
      toast.error(tc("maxLinksLimit", { max: MAX_LINKS }));
      return;
    }
    if (linkItems.some((l) => l.fileUrl === trimmed)) {
      toast.error(tc("duplicateUrl"));
      return;
    }
    setLinkErr("");
    const fileName = trimmed.split("/").pop()?.split("?")[0] || "link";
    setLinkItems((prev) => [...prev, { id: nextId++, fileName, fileUrl: trimmed }]);
    setLinkUrl("");
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const valid: FileItem[] = [];

    for (const file of selected) {
      if (fileItems.length + valid.length >= MAX_FILES) {
        toast.error(tc("maxFilesLimit", { max: MAX_FILES }));
        break;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(tc("exceedsSizeLimit", { name: file.name, limit: UPLOAD_LIMITS_MB.taskAttachment }));
        continue;
      }
      if (!ALLOWED_TYPES.has(file.type)) {
        toast.error(tc("unsupportedFileType", { name: file.name }));
        continue;
      }
      if (fileItems.some((f) => f.name === file.name) || valid.some((f) => f.name === file.name)) {
        toast.error(tc("duplicateFile", { name: file.name }), { icon: "⚠️" });
        continue;
      }
      valid.push({ id: nextId++, file, name: file.name, size: file.size, mimeType: file.type });
    }

    if (valid.length > 0) setFileItems((prev) => [...prev, ...valid]);
    // reset input so user can re-select the same file
    e.target.value = "";
  };

  const removeFile = (id: number) => {
    setFileItems((prev) => prev.filter((f) => f.id !== id));
    setFileStatuses((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const removeLink = (id: number) => {
    setLinkItems((prev) => prev.filter((l) => l.id !== id));
    setLinkStatuses((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const { data: taskGroupsData } = useTaskGroups();
  const taskGroups = useMemo(() => extractTaskGroups(taskGroupsData?.data), [taskGroupsData]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<CreateTaskPayload>({
    mode: "onBlur",
  });

  const deadlineVal = watch("deadline");
  const startDateVal = watch("startDate");
  const estDaysVal = watch("estDays");

  // Auto set startDate to TODAY when intern is selected and startDate is empty
  useEffect(() => {
    if (selectedInternId && !startDateVal) {
      setValue("startDate", TODAY, { shouldValidate: true });
    }
  }, [selectedInternId, startDateVal, setValue]);

  // Auto calculate deadline from startDate and estDays: startDate + (ceil(estDays) - 1)
  useEffect(() => {
    if (startDateVal && estDaysVal && Number.isFinite(estDaysVal) && estDaysVal > 0) {
      const start = new Date(startDateVal);
      if (!Number.isNaN(start.getTime())) {
        const daysToAdd = Math.max(0, Math.ceil(estDaysVal) - 1);
        const deadlineDate = new Date(start);
        deadlineDate.setDate(deadlineDate.getDate() + daysToAdd);
        const yyyy = deadlineDate.getFullYear();
        const mm = String(deadlineDate.getMonth() + 1).padStart(2, "0");
        const dd = String(deadlineDate.getDate()).padStart(2, "0");
        const autoDeadline = `${yyyy}-${mm}-${dd}`;
        setValue("deadline", autoDeadline, { shouldValidate: true });
      }
    } else {
      // Khi thiếu startDate hoặc estDays, hạn chót để trống
      setValue("deadline", "", { shouldValidate: true });
    }
  }, [startDateVal, estDaysVal, setValue]);

  useEffect(() => {
    register("startDate", {
      validate: (v) => {
        if (!v) return true;
        if (v < TODAY) return tc("startDatePast");
        return true;
      },
    });
    register("deadline");
    register("priority", {
      validate: (v) => !v || ["HIGH", "MEDIUM", "LOW"].includes(v) || tc("priorityPlaceholder"),
    });
    register("taskGroupId");
  }, [register, tc]);

  const availableWorkingDays = startDateVal && deadlineVal
    ? countWorkingDaysInclusive(startDateVal, deadlineVal)
    : null;
  const hasScheduleRisk = availableWorkingDays !== null
    && Number.isFinite(estDaysVal)
    && estDaysVal > availableWorkingDays;

  const handleNext = async (e: React.MouseEvent) => {
    e.preventDefault();
    let valid = false;
    if (step === 1) valid = await trigger(["title", "code", "priority", "taskGroupId"]);
    if (step === 2) valid = await trigger(["startDate", "estDays", "phase", "module", "description", "acceptanceCriteria", "taskNotes"]);
    if (valid) setStep((s) => s + 1);
  };

  const onSubmit = async (data: CreateTaskPayload) => {
    if (step !== 3 || submittingRef.current) return;
    submittingRef.current = true;
    // strip empty optional fields so Zod doesn't reject ""
    const payload: CreateTaskPayload = {
      ...data,
      estDays: data.estDays,
      startDate: data.startDate || undefined,
      deadline: data.deadline || undefined,
      taskGroupId: data.taskGroupId || undefined,
      priority: data.priority || undefined,
      code: data.code || undefined,
    };

    try {
      setIsUploading(true);

      let taskId = createdTaskId;
      if (!taskId) {
        const result = await createTask.mutateAsync(payload);
        taskId = result.data.id;
        setCreatedTaskId(taskId);
      }

      if (linkItems.length === 0 && fileItems.length === 0) {
        // assign task to intern if selected (even without attachments)
        if (selectedInternId) {
          try {
            await createAssignment.mutateAsync({
              taskId,
              internId: selectedInternId,
              ...(assignMode === "other"
                ? { internEmail: otherInternEmail.trim().toLowerCase() }
                : {}),
            });
          } catch (err) {
            console.error("[TaskCreateModal] Failed to create assignment:", err);
          }
        }
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        reset();
        setStep(1);
        setCreatedTaskId(null);
        submittingRef.current = false;
        onCloseModal?.();
        return;
      }

      const filesToUpload = fileItems.filter((f) => fileStatuses[f.id] !== "success");
      const linksToUpload = linkItems.filter((l) => linkStatuses[l.id] !== "success");

      // set all to uploading
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

      let successCount = fileItems.length - filesToUpload.length + linkItems.length - linksToUpload.length;
      let failCount = 0;

      // upload files in batches of BATCH_SIZE
      for (let i = 0; i < filesToUpload.length; i += BATCH_SIZE) {
        const batch = filesToUpload.slice(i, i + BATCH_SIZE);
        try {
          await taskAttachmentService.uploadMultiple(
            taskId,
            batch.map((f) => f.file),
          );
          batch.forEach((f) => {
            setFileStatuses((prev) => ({ ...prev, [f.id]: "success" }));
          });
          successCount += batch.length;
        } catch (err) {
          console.error("File batch upload failed:", err);
          batch.forEach((f) => {
            setFileStatuses((prev) => ({ ...prev, [f.id]: "error" }));
          });
          failCount += batch.length;
        }
      }

      // upload links
      for (const link of linksToUpload) {
        try {
          await taskAttachmentService.createTaskAttachmentLink(taskId, link.fileName, link.fileUrl);
          setLinkStatuses((prev) => ({ ...prev, [link.id]: "success" }));
          successCount++;
        } catch (err) {
          console.error("Link upload failed:", err);
          setLinkStatuses((prev) => ({ ...prev, [link.id]: "error" }));
          failCount++;
          const msg =
            axios.isAxiosError(err) && err.response?.data?.message
              ? err.response.data.message
              : "Link upload failed";
          toast.error(`"${link.fileName}": ${msg}`);
        }
      }

      // refetch tasks so attachments appear without page reload
      queryClient.invalidateQueries({ queryKey: ["tasks"], exact: false });

      // assign task to intern if selected
      if (selectedInternId) {
        try {
          await createAssignment.mutateAsync({
            taskId,
            internId: selectedInternId,
            ...(assignMode === "other"
              ? { internEmail: otherInternEmail.trim().toLowerCase() }
              : {}),
          });
        } catch {
          // handled by hook
        }
      }

      // ensure tasks refetch with assignment data
      queryClient.invalidateQueries({ queryKey: ["tasks"], exact: false });

      if (failCount > 0) {
        toast.error(tc("taskCreatedPartial", { fail: failCount, success: successCount }));
        setIsUploading(false);
        submittingRef.current = false;
      } else {
        toast.success(tc("taskCreatedSuccess"));
        setTimeout(() => {
          reset();
          setStep(1);
          setFileItems([]);
          setLinkItems([]);
          setFileStatuses({});
          setLinkStatuses({});
          setIsUploading(false);
          setCreatedTaskId(null);
          submittingRef.current = false;
          onCloseModal?.();
        }, 800);
      }
    } catch {
      toast.error(tc("unexpectedError"));
      setIsUploading(false);
      submittingRef.current = false;
    }
  };

  const isPending = createTask.isPending || isUploading;

  const inputClass = (name: keyof CreateTaskPayload, extra = "") =>
    `w-full h-[42px] sm:h-[46px] rounded-xl border px-4 text-xs sm:text-sm text-foreground placeholder:text-muted focus:outline-none transition ${
      errors[name]
        ? "border-red-400/60 focus:border-red-400"
        : "border-border bg-card focus:border-primary-light/40"
    } ${extra}`;

  const textareaClass = (name: keyof CreateTaskPayload, extra = "") =>
    `w-full rounded-xl border px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-foreground placeholder:text-muted focus:outline-none transition ${
      errors[name]
        ? "border-red-400/60 focus:border-red-400"
        : "border-border bg-card focus:border-primary-light/40"
    } ${extra}`;

  const ErrorMsg = ({ name }: { name: keyof CreateTaskPayload }) =>
    errors[name] ? (
      <p className="mt-1 flex items-center gap-1.5 text-xs text-red-400 animate-fadeIn">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        {errors[name]?.message}
      </p>
    ) : null;

  return (
    <div className="flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-xl pb-4 pt-1 -mt-1 border-b border-border dark:border-white/10 pr-10 sm:pr-12">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-100 border border-cyan-300 text-cyan-700 dark:bg-cyan-500/15 dark:border-cyan-500/30 dark:text-cyan-300 shadow-sm dark:shadow-[0_0_12px_rgba(6,182,212,0.2)]">
              <Plus className="h-5 w-5 shrink-0" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-bold metal-text truncate">
                {tc("title")}
              </h3>
              <p className="text-xs text-muted mt-0.5 truncate">
                {step === 1
                  ? tc("step1Subtitle")
                  : step === 2
                  ? tc("step2Subtitle")
                  : tc("step3Subtitle")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stepper indicator */}
      <div className="my-5 flex items-center justify-center">
        {[
          { num: 1, label: tc("step1Label"), desc: tc("step1Desc") },
          { num: 2, label: tc("step2Label"), desc: tc("step2Desc") },
          { num: 3, label: tc("step3Label"), desc: tc("step3Desc") },
        ].map((s, i, arr) => (
          <div key={s.num} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-xs sm:text-sm font-bold transition-all duration-300 ${
                  step > s.num
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
                    : step === s.num
                    ? "bg-cyan-100 text-cyan-700 border border-cyan-300 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-400/50 shadow-sm dark:shadow-[0_0_16px_rgba(6,182,212,0.3)]"
                    : "bg-slate-100 text-muted border border-border dark:bg-white/5 dark:border-white/10"
                }`}
              >
                {step > s.num ? <CheckCircle2 className="h-4 w-4" /> : s.num}
              </div>
              <span
                className={`text-[11px] sm:text-xs font-semibold uppercase tracking-wider transition-colors duration-300 ${
                  step === s.num ? "metal-text metal-glow" : step > s.num ? "text-emerald-600 dark:text-emerald-400" : "text-muted"
                }`}
              >
                {s.label}
              </span>
              <span className={`hidden sm:block text-[10px] leading-tight text-center max-w-[100px] transition-colors duration-300 ${step === s.num ? "text-muted" : "text-muted/50"}`}>
                {s.desc}
              </span>
            </div>
            {i < arr.length - 1 && (
              <div className={`mx-1 sm:mx-3 mb-6 sm:mb-8 h-px w-8 sm:w-14 md:w-20 transition-colors duration-300 ${step > s.num ? "bg-emerald-500/40" : "bg-border dark:bg-white/10"}`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* ─── Step 1: Basic Info ─── */}
        {step === 1 && (
          <>
            <div>
              <label className="mb-1.5 flex items-center gap-1 text-xs sm:text-sm font-medium text-foreground/90 select-none">
                {tc("titleLabel")} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder={tc("titlePlaceholder")}
                {...register("title", {
                  required: tc("titleRequired"),
                  maxLength: { value: 255, message: tc("titleMaxLength") },
                })}
                className={inputClass("title")}
              />
              <ErrorMsg name="title" />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-xs sm:text-sm font-medium text-foreground/90 select-none">
                  {tc("codeLabel")}
                </label>
                <input
                  type="text"
                  placeholder={tc("codePlaceholder")}
                  {...register("code", {
                    pattern: { value: /^[A-Za-z0-9._-]*$/, message: tc("codePattern") },
                    maxLength: { value: 50, message: tc("codeMaxLength") },
                  })}
                  className={inputClass("code")}
                />
                <ErrorMsg name="code" />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1 text-xs sm:text-sm font-medium text-foreground/90 select-none">
                  {tc("priorityLabel")}
                </label>
                <Select
                  value={watch("priority") ?? ""}
                  onChange={(v) => {
                    setValue("priority", (v || undefined) as CreateTaskPayload["priority"], { shouldValidate: true });
                  }}
                  placeholder={tc("priorityPlaceholder")}
                  options={[
                    { value: "", label: tc("priorityPlaceholder") },
                    { value: "HIGH", label: tc("priorityHigh") },
                    { value: "MEDIUM", label: tc("priorityMedium") },
                    { value: "LOW", label: tc("priorityLow") },
                  ]}
                />
                <ErrorMsg name="priority" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1 text-xs sm:text-sm font-medium text-foreground/90 select-none">
                {tc("groupLabel")}
              </label>
              <Select
                value={watch("taskGroupId") ?? ""}
                onChange={(v) => {
                  setValue("taskGroupId", v || undefined, { shouldValidate: true });
                }}
                placeholder={tc("noGroup")}
                options={[
                  { value: "", label: tc("noGroup") },
                  ...taskGroups.map((tg) => ({
                    value: tg.id,
                    label: tg.name,
                  })),
                ]}
              />
            </div>
          </>
        )}

        {/* ─── Step 2: Planning ─── */}
        {step === 2 && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-xs sm:text-sm font-medium text-foreground/90 select-none">
                  {tc("startDateLabel")}
                </label>
                <DatePicker
                  value={watch("startDate") ?? ""}
                  minDate={TODAY}
                  placeholder="YYYY-MM-DD"
                  onChange={(d) => {
                    setValue("startDate", d, { shouldValidate: true });
                  }}
                  onClear={() => {
                    setValue("startDate", "", { shouldValidate: true });
                  }}
                />
                <ErrorMsg name="startDate" />
                <p className="mt-1 text-[11px] text-muted">{tc("startDateHint")}</p>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1 text-xs sm:text-sm font-medium text-foreground/90 select-none">
                  {tc("estDaysLabel")} <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min={0.1}
                  placeholder={tc("estDaysPlaceholder")}
                  {...register("estDays", {
                    valueAsNumber: true,
                    required: tc("estDaysRequired"),
                    min: { value: 0.1, message: tc("estDaysMin") },
                    max: { value: 365, message: tc("estDaysMax") },
                  })}
                  className={inputClass("estDays")}
                />
                <ErrorMsg name="estDays" />
                <p className="mt-1 text-[11px] text-muted">{tc("estDaysHint")}</p>
              </div>

              <div>
                <label className="mb-1.5 flex items-center justify-between gap-1 text-xs sm:text-sm font-medium text-foreground/90 select-none">
                  <span>{tc("deadlineLabel")}</span>
                  <span className="text-[11px] text-cyan-400 font-normal">
                    {tc("deadlineAutoBadge")}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={deadlineVal ? `${deadlineVal} (23:59:59)` : tc("deadlineNotSet")}
                    className="w-full h-[42px] sm:h-[46px] rounded-xl border border-border bg-slate-100/80 dark:bg-white/5 px-4 pr-10 text-xs sm:text-sm text-foreground/80 font-medium cursor-not-allowed focus:outline-none"
                  />
                  <Clock className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
                </div>
                <input type="hidden" {...register("deadline")} />
                <p className="mt-1 text-[11px] text-muted">
                  {startDateVal && estDaysVal
                    ? tc("deadlineAutoFormula", { estDays: estDaysVal })
                    : tc("deadlineNoStartHint")}
                </p>
              </div>
            </div>

            {hasScheduleRisk && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  {tc("scheduleRiskWarning", {
                    available: availableWorkingDays ?? 0,
                    est: estDaysVal ?? 0,
                  })}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-xs sm:text-sm font-medium text-foreground/90 select-none">
                  {tc("phaseLabel")}
                </label>
                <input
                  type="text"
                  placeholder={tc("phasePlaceholder")}
                  {...register("phase", { maxLength: { value: 100, message: tc("phaseMaxLength") } })}
                  className={inputClass("phase")}
                />
                <ErrorMsg name="phase" />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1 text-xs sm:text-sm font-medium text-foreground/90 select-none">
                  {tc("moduleLabel")}
                </label>
                <input
                  type="text"
                  placeholder={tc("modulePlaceholder")}
                  {...register("module", { maxLength: { value: 100, message: tc("moduleMaxLength") } })}
                  className={inputClass("module")}
                />
                <ErrorMsg name="module" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1 text-xs sm:text-sm font-medium text-foreground/90 select-none">
                {tc("descLabel")}
              </label>
              <textarea
                rows={2}
                placeholder={tc("descPlaceholder")}
                {...register("description", { maxLength: { value: 2000, message: tc("descMaxLength") } })}
                className={textareaClass("description", "resize-none")}
              />
              <ErrorMsg name="description" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-xs sm:text-sm font-medium text-foreground/90 select-none">
                  {tc("criteriaLabel")}
                </label>
                <textarea
                  rows={2}
                  placeholder={tc("criteriaPlaceholder")}
                  {...register("acceptanceCriteria", { maxLength: { value: 2000, message: tc("criteriaMaxLength") } })}
                  className={textareaClass("acceptanceCriteria", "resize-none")}
                />
                <ErrorMsg name="acceptanceCriteria" />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1 text-xs sm:text-sm font-medium text-foreground/90 select-none">
                  {tc("notesLabel")}
                </label>
                <textarea
                  rows={2}
                  placeholder={tc("notesPlaceholder")}
                  {...register("taskNotes", { maxLength: { value: 2000, message: tc("notesMaxLength") } })}
                  className={textareaClass("taskNotes", "resize-none")}
                />
                <ErrorMsg name="taskNotes" />
              </div>
            </div>
          </>
        )}

        {/* ─── Step 3: Attachments & Assign ─── */}
        {step === 3 && (
          <>
            {/* Attachments */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="flex items-center gap-1 text-xs sm:text-sm font-medium text-foreground/90 select-none">
                  {tc("attachmentsLabel")}
                </label>
                {(fileItems.length > 0 || linkItems.length > 0) && (
                  <span className="text-xs text-muted">
                    {fileItems.length > 0 && tc("countFiles", { n: fileItems.length })}
                    {fileItems.length > 0 && linkItems.length > 0 && ", "}
                    {linkItems.length > 0 && tc("countLinks", { n: linkItems.length })}
                  </span>
                )}
              </div>

              <div className="space-y-2.5">
                {fileItems.length < MAX_FILES && (
                  <div className="space-y-1">
                    <input
                      type="file"
                      multiple
                      disabled={isUploading}
                      onChange={handleFilesChange}
                      className="w-full h-[42px] sm:h-[46px] rounded-xl border border-border bg-card px-4 py-2 text-xs sm:text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-500/15 file:px-3 file:py-1 file:text-xs file:font-medium file:text-cyan-300 file:cursor-pointer focus:border-primary-light/40 focus:outline-none transition disabled:opacity-50"
                    />
                    <p className="text-[11px] text-muted">
                      {tc("uploadLimitsHint", {
                        maxFiles: MAX_FILES,
                        maxSize: UPLOAD_LIMITS_MB.taskAttachment,
                      })}
                    </p>
                  </div>
                )}
                {fileItems.length >= MAX_FILES && (
                  <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-300">
                    {tc("fileLimitReached", { max: MAX_FILES })}
                  </p>
                )}

                {linkItems.length < MAX_LINKS && (
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={linkUrl}
                      disabled={isUploading}
                      onChange={(e) => { setLinkUrl(e.target.value); if (linkErr) setLinkErr(""); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
                      placeholder={tc("linkPlaceholder")}
                      className="flex-1 h-[42px] sm:h-[46px] rounded-xl border border-border bg-card px-4 text-xs sm:text-sm text-foreground placeholder:text-muted focus:border-primary-light/40 focus:outline-none transition disabled:opacity-50"
                    />
                    <Button type="button" variant="glass" size="md" onClick={addLink} disabled={!linkUrl.trim() || isUploading}>
                      <Link className="h-3.5 w-3.5 mr-1" />
                      {tc("addLinkBtn")}
                    </Button>
                  </div>
                )}
                {linkErr && <p className="text-xs text-red-400">{linkErr}</p>}

                {(fileItems.length > 0 || linkItems.length > 0) && (
                  <div className="mt-3 space-y-1.5 max-h-44 overflow-y-auto scrollbar-dropdown pr-1">
                    {(fileItems.length + linkItems.length > 3 && !isUploading) && (
                      <button
                        type="button"
                        onClick={() => { setFileItems([]); setLinkItems([]); setFileStatuses({}); setLinkStatuses({}); }}
                        className="mb-1 text-xs text-muted hover:text-red-400 transition-colors cursor-pointer"
                      >
                        {tc("clearAllBtn")}
                      </button>
                    )}

                    {fileItems.map((f) => {
                      const cat = getFileCategory(f.mimeType);
                      const Icon = getFileIcon(cat);
                      const color = getFileColor(cat);
                      const status = fileStatuses[f.id] ?? "pending";
                      return (
                        <div key={f.id} className="flex items-center gap-3 rounded-xl border border-border bg-slate-50/70 p-2.5 group dark:border-white/10 dark:bg-white/5">
                          <Icon className={`h-5 w-5 shrink-0 ${color}`} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-foreground">{f.name}</p>
                            <p className="text-xs text-muted">{formatFileSize(f.size)}</p>
                          </div>
                          <div className="shrink-0">
                            {status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />}
                            {status === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                            {status === "error" && <AlertCircle className="h-4 w-4 text-red-400" />}
                          </div>
                          {!isUploading && (
                            <button type="button" onClick={() => removeFile(f.id)} className="shrink-0 rounded p-1 text-muted hover:bg-slate-200 dark:hover:bg-white/10 hover:text-red-400 cursor-pointer transition-colors">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {linkItems.map((l) => {
                      const status = linkStatuses[l.id] ?? "pending";
                      const domain = (() => { try { return new URL(l.fileUrl).hostname; } catch { return ""; } })();
                      return (
                        <div key={l.id} className="flex items-center gap-3 rounded-xl border border-border bg-slate-50/70 p-2.5 group dark:border-white/10 dark:bg-white/5">
                          <Link className="h-5 w-5 shrink-0 text-blue-400" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-foreground">{l.fileName}</p>
                            <p className="truncate text-xs text-muted">{domain}</p>
                          </div>
                          <div className="shrink-0">
                            {status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />}
                            {status === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                            {status === "error" && <AlertCircle className="h-4 w-4 text-red-400" />}
                          </div>
                          {!isUploading && (
                            <button type="button" onClick={() => removeLink(l.id)} className="shrink-0 rounded p-1 text-muted hover:bg-slate-200 dark:hover:bg-white/10 hover:text-red-400 cursor-pointer transition-colors">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {fileItems.length === 0 && linkItems.length === 0 && (
                  <p className="mt-2 text-xs text-muted italic">{tc("noAttachmentsYet")}</p>
                )}
              </div>
            </div>

            {/* Assign to Intern */}
            <div className="pt-2 border-t border-border dark:border-white/10">
              <label className="mb-2 flex items-center gap-1 text-xs sm:text-sm font-medium text-foreground/90 select-none">
                {tc("assignInternLabel")}
              </label>
              <div className="flex gap-2 mb-3">
                {(["none", "my", "other"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setAssignMode(mode);
                      setSelectedInternId("");
                      setOtherInternEmail("");
                      setOtherInternEmailError("");
                      lookupAssignmentIntern.reset();
                    }}
                    disabled={isUploading}
                    className={`rounded-xl px-3 py-2 text-xs font-medium transition cursor-pointer ${
                      assignMode === mode
                        ? "bg-cyan-100 text-cyan-800 border border-cyan-300 shadow-sm dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-400/40 dark:shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                        : "bg-slate-50 text-muted border border-border hover:bg-slate-100 hover:text-foreground dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 dark:hover:text-foreground"
                    }`}
                  >
                    {mode === "none" && tc("modeNone")}
                    {mode === "my" && (
                      <span className="flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5" />{tc("modeMy")}</span>
                    )}
                    {mode === "other" && (
                      <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{tc("modeOther")}</span>
                    )}
                  </button>
                ))}
              </div>

              {assignMode === "my" && (
                <Select
                  value={selectedInternId}
                  onChange={(val) => setSelectedInternId(val)}
                  disabled={isUploading}
                  placeholder={tc("selectMyInternPlaceholder")}
                  options={[
                    { value: "", label: tc("selectMyInternPlaceholder") },
                    ...myInterns.map((intern) => ({
                      value: intern.id,
                      label: `${intern.fullName} (${intern.user.email})`,
                    })),
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
                      placeholder={tc("otherInternEmailPlaceholder")}
                      disabled={isUploading || lookupAssignmentIntern.isPending}
                      className="min-w-0 flex-1 h-[42px] sm:h-[46px] rounded-xl border border-border bg-card px-4 text-xs sm:text-sm text-foreground placeholder:text-muted focus:border-primary-light/40 focus:outline-none transition disabled:opacity-50"
                    />
                    <Button
                      type="button"
                      variant="glass"
                      size="md"
                      onClick={() => void handleOtherInternLookup()}
                      disabled={isUploading || lookupAssignmentIntern.isPending}
                    >
                      {lookupAssignmentIntern.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        tc("checkEmailBtn")
                      )}
                    </Button>
                  </div>

                  {otherInternEmailError && (
                    <p className="text-xs text-red-400 flex items-center gap-1.5 animate-fadeIn">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {otherInternEmailError}
                    </p>
                  )}

                  {selectedInternId && lookupAssignmentIntern.data?.data && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                      <p className="text-sm font-medium text-emerald-300">
                        {lookupAssignmentIntern.data.data.fullName}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {tc("leaderLabel", {
                          name: lookupAssignmentIntern.data.data.leader.fullName || lookupAssignmentIntern.data.data.leader.email,
                        })}
                      </p>
                    </div>
                  )}

                  {!selectedInternId && !otherInternEmailError && (
                    <p className="text-xs text-muted">
                      {tc("verifyHint")}
                    </p>
                  )}
                </div>
              )}

              {assignMode === "my" && myInterns.length === 0 && (
                <p className="text-xs text-muted italic">{tc("noInternsInTeam")}</p>
              )}
            </div>
          </>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-3 border-t border-border dark:border-white/10">
          {step > 1 ? (
            <Button type="button" variant="glass" size="md" disabled={isPending} onClick={() => setStep((s) => s - 1)}>
              {tc("backBtn")}
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <Button type="button" variant="glass" size="md" disabled={isPending} onClick={onCloseModal}>
              {tc("cancelBtn")}
            </Button>
            {step < 3 ? (
              <Button type="button" variant="primary" size="md" onClick={handleNext}>
                {tc("nextBtn")}
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isPending}
                disabled={isPending || (assignMode === "other" && !selectedInternId)}
              >
                {!isPending && <Plus className="h-4 w-4 mr-2" />}
                {tc("createBtn")}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
