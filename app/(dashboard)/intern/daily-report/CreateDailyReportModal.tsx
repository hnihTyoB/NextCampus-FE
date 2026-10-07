"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, FileText, Link as LinkIcon, Video, Loader2, Paperclip, AlertCircle, Clock, CalendarCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCreateDailyReport } from "@/hooks/daily-report/useCreateDailyReport";
import { useUploadVideoDemo } from "@/hooks/daily-report/useUploadVideoDemo";
import { useUploadReportAttachmentR2 } from "@/hooks/daily-report/useUploadReportAttachmentR2";
import { toast } from "react-hot-toast";
import { ATTACHMENT_MIME_TYPES, exceedsUploadLimit, UPLOAD_LIMITS_MB, UPLOAD_MAX_FILES, VIDEO_MIME_TYPES } from "@/lib/upload-policy";
import type { CreateReportAttachmentPayload } from "@/types/daily-report";

const MAX_REPORT_ATTACHMENTS = UPLOAD_MAX_FILES.reportAttachment;

type Props = { onClose: () => void };

export default function CreateDailyReportModal({ onClose }: Props) {
  const tm = useTranslations("intern.dailyReport.createModal");
  const createDailyReport = useCreateDailyReport();
  const uploadVideo = useUploadVideoDemo();
  const { uploadFile } = useUploadReportAttachmentR2();

  const [content, setContent] = useState("");
  const [blockers, setBlockers] = useState("");
  const [nextPlan, setNextPlan] = useState("");
  const [hoursWorked, setHoursWorked] = useState<number>(8);
  const [prLink, setPrLink] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState<string | null>(null);

  const isPending = isSubmitting || createDailyReport.isPending || uploadVideo.isPending;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isPending]);

  function handleVideoFileChange(file: File | undefined) {
    if (!file) {
      setVideoFile(null);
      return;
    }
    if (!VIDEO_MIME_TYPES.has(file.type)) {
      setVideoFile(null);
      toast.error(tm("videoTypeError"));
      return;
    }
    if (exceedsUploadLimit(file, UPLOAD_LIMITS_MB.reportVideo)) {
      setVideoFile(null);
      toast.error(tm("videoSizeError", { limit: UPLOAD_LIMITS_MB.reportVideo }));
      return;
    }
    setVideoFile(file);
  }

  function handleAttachmentFilesChange(files: File[]) {
    const remainingSlots = Math.max(0, MAX_REPORT_ATTACHMENTS - attachmentFiles.length);
    const accepted: File[] = [];
    for (const file of files.slice(0, remainingSlots)) {
      if (!ATTACHMENT_MIME_TYPES.has(file.type)) {
        toast.error(tm("unsupportedType", { name: file.name }));
        continue;
      }
      if (exceedsUploadLimit(file, UPLOAD_LIMITS_MB.reportAttachment)) {
        toast.error(tm("fileSizeError", { name: file.name, limit: UPLOAD_LIMITS_MB.reportAttachment }));
        continue;
      }
      accepted.push(file);
    }
    if (files.length > remainingSlots) {
      toast.error(tm("maxAttachments", { max: MAX_REPORT_ATTACHMENTS }));
    }
    if (accepted.length > 0) {
      setAttachmentFiles((current) => [...current, ...accepted]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    if (!content.trim()) {
      toast.error(tm("requiredContentError"));
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload attachments directly to Cloudflare R2 if any
      const uploadedAttachments: CreateReportAttachmentPayload[] = [];
      if (attachmentFiles.length > 0) {
        setUploadStatusText(tm("uploadingAttachments", { count: attachmentFiles.length }));
        for (let i = 0; i < attachmentFiles.length; i++) {
          const file = attachmentFiles[i];
          setUploadStatusText(tm("uploadingAttachmentItem", { current: i + 1, total: attachmentFiles.length, name: file.name }));
          const uploaded = await uploadFile(file);
          uploadedAttachments.push(uploaded);
        }
      }

      setUploadStatusText(tm("savingReport"));

      // 2. Submit daily report
      const result = await createDailyReport.mutateAsync({
        content: content.trim(),
        blockers: blockers.trim() || null,
        nextPlan: nextPlan.trim() || null,
        hoursWorked: hoursWorked !== undefined && hoursWorked !== null ? Number(hoursWorked) : 8,
        prLink: prLink.trim() || null,
        videoDemo: videoLink.trim() || null,
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      });

      const reportId = result.data.id;

      // 3. Upload video demo if selected as file
      if (videoFile && reportId) {
        setUploadStatusText(tm("uploadingVideo"));
        await uploadVideo.mutateAsync({ id: reportId, file: videoFile });
      }

      toast.success(tm("submitSuccess"));
      onClose();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : tm("submitError");
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
      setUploadStatusText(null);
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tm("title")}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden rounded-[24px] sm:rounded-[28px] border border-border dark:border-white/10 bg-white dark:bg-[#0c1222]/95 shadow-glass backdrop-blur-2xl text-foreground transition-all duration-200"
      >
        <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-cyan-500/10 dark:bg-cyan-400/10 blur-3xl pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/60 dark:via-cyan-400/80 to-transparent" />

        {/* Sticky Header with pr-12 against close button collision */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-xl border-b border-border dark:border-white/10 p-5 sm:p-6 pr-12">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300 bg-cyan-100/80 text-cyan-700 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-400 shadow-xs dark:shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                <span className="metal-text">{tm("title")}</span>
              </h2>
              <p className="mt-0.5 text-xs text-muted truncate">{tm("description")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 hover:text-foreground dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white transition active:scale-95 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar">
          {/* Work Content */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs sm:text-sm font-medium text-foreground/90 select-none">
              <FileText className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>{tm("reportContent")}</span>
              <span className="text-danger font-bold">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={tm("contentPlaceholder")}
              rows={4}
              required
              disabled={isPending}
              className="w-full rounded-xl border border-border bg-slate-50/70 hover:border-border-strong focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-slate-950/60 dark:hover:border-white/20 dark:focus:border-cyan-400/50 dark:focus:ring-cyan-400/20 p-3.5 text-sm text-foreground placeholder:text-muted/60 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed resize-y custom-scrollbar"
            />
          </div>

          {/* Blockers & Challenges */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs sm:text-sm font-medium text-foreground/90 select-none">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{tm("blockersLabel")}</span>
            </label>
            <textarea
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              placeholder={tm("blockersPlaceholder")}
              rows={2}
              disabled={isPending}
              className="w-full rounded-xl border border-border bg-slate-50/70 hover:border-border-strong focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-slate-950/60 dark:hover:border-white/20 dark:focus:border-amber-400/50 dark:focus:ring-amber-400/20 p-3.5 text-sm text-foreground placeholder:text-muted/60 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed resize-y custom-scrollbar"
            />
          </div>

          {/* Next Day Plan */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs sm:text-sm font-medium text-foreground/90 select-none">
              <CalendarCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{tm("nextPlanLabel")}</span>
            </label>
            <textarea
              value={nextPlan}
              onChange={(e) => setNextPlan(e.target.value)}
              placeholder={tm("nextPlanPlaceholder")}
              rows={2}
              disabled={isPending}
              className="w-full rounded-xl border border-border bg-slate-50/70 hover:border-border-strong focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-white/10 dark:bg-slate-950/60 dark:hover:border-white/20 dark:focus:border-emerald-400/50 dark:focus:ring-emerald-400/20 p-3.5 text-sm text-foreground placeholder:text-muted/60 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed resize-y custom-scrollbar"
            />
          </div>

          {/* Hours Worked & PR Link Grid (Uniform Field Height: h-[42px] sm:h-[46px]) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs sm:text-sm font-medium text-foreground/90 select-none">
                <Clock className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <span>{tm("hoursWorkedLabel")}</span>
              </label>
              <input
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={hoursWorked}
                onChange={(e) => setHoursWorked(Number(e.target.value))}
                placeholder={tm("hoursWorkedPlaceholder")}
                disabled={isPending}
                className="h-[42px] sm:h-[46px] w-full rounded-xl border border-border bg-slate-50/70 hover:border-border-strong focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-slate-950/60 dark:hover:border-white/20 dark:focus:border-cyan-400/50 dark:focus:ring-cyan-400/20 px-4 text-sm text-foreground placeholder:text-muted/60 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed font-mono"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs sm:text-sm font-medium text-foreground/90 select-none">
                <LinkIcon className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <span>{tm("prLink")}</span>
              </label>
              <input
                type="url"
                value={prLink}
                onChange={(e) => setPrLink(e.target.value)}
                placeholder={tm("prPlaceholder")}
                disabled={isPending}
                className="h-[42px] sm:h-[46px] w-full rounded-xl border border-border bg-slate-50/70 hover:border-border-strong focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-slate-950/60 dark:hover:border-white/20 dark:focus:border-cyan-400/50 dark:focus:ring-cyan-400/20 px-4 text-sm text-foreground placeholder:text-muted/60 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Video Demo */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs sm:text-sm font-medium text-foreground/90 select-none">
              <Video className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>{tm("videoDemo")}</span>
            </label>
            <div className="space-y-2">
              <input
                type="url"
                value={videoLink}
                onChange={(e) => setVideoLink(e.target.value)}
                placeholder={tm("videoPlaceholder")}
                disabled={isPending || !!videoFile}
                className="h-[42px] sm:h-[46px] w-full rounded-xl border border-border bg-slate-50/70 hover:border-border-strong focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-slate-950/60 dark:hover:border-white/20 dark:focus:border-cyan-400/50 dark:focus:ring-cyan-400/20 px-4 text-sm text-foreground placeholder:text-muted/60 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="h-px flex-1 bg-border dark:bg-white/10" />
                <span>{tm("or")}</span>
                <span className="h-px flex-1 bg-border dark:bg-white/10" />
              </div>
              {videoFile ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-300 px-4 py-2.5">
                  <span className="text-sm font-medium truncate">{videoFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setVideoFile(null)}
                    disabled={isPending}
                    className="text-xs text-slate-500 hover:text-danger dark:text-slate-400 dark:hover:text-rose-400 transition cursor-pointer font-medium"
                  >
                    {tm("remove")}
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/x-msvideo,.mp4,.webm,.mov,.mkv,.avi"
                  disabled={isPending || !!videoLink.trim()}
                  onChange={(e) => handleVideoFileChange(e.target.files?.[0])}
                  className="h-[42px] sm:h-[46px] w-full rounded-xl border border-border bg-slate-50/70 hover:border-border-strong focus:border-cyan-500 dark:border-white/10 dark:bg-slate-950/60 dark:hover:border-white/20 dark:focus:border-cyan-400/50 px-4 py-2 sm:py-2.5 text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-100 file:text-cyan-700 dark:file:bg-cyan-500/10 dark:file:text-cyan-300 file:px-3 file:py-1 file:text-xs file:font-semibold file:cursor-pointer cursor-pointer align-middle file:align-middle outline-none transition disabled:opacity-50"
                />
              )}
              <p className="text-[11px] text-muted">{tm("videoFileHint", { limit: UPLOAD_LIMITS_MB.reportVideo })}</p>
            </div>
          </div>

          {/* Attachments */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs sm:text-sm font-medium text-foreground/90 select-none">
              <Paperclip className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>{tm("attachments")}</span>
            </label>
            <div className="space-y-2">
              {attachmentFiles.length > 0 && (
                <div className="space-y-1.5">
                  {attachmentFiles.map((file, i) => (
                    <div
                      key={`${file.name}-${i}`}
                      className="flex items-center justify-between rounded-xl border border-border bg-slate-50/80 dark:border-white/10 dark:bg-slate-950/60 px-4 py-2"
                    >
                      <span className="text-sm text-foreground truncate font-medium">{file.name}</span>
                      <span className="text-xs text-muted font-mono mx-2">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        type="button"
                        onClick={() => setAttachmentFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        disabled={isPending}
                        className="text-xs text-slate-500 hover:text-danger dark:text-slate-400 dark:hover:text-rose-400 ml-2 shrink-0 transition cursor-pointer font-medium"
                      >
                        {tm("remove")}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif,.pdf,.doc,.docx,.zip,.rar,.7z"
                disabled={isPending}
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  handleAttachmentFilesChange(files);
                  e.target.value = "";
                }}
                className="h-[42px] sm:h-[46px] w-full rounded-xl border border-border bg-slate-50/70 hover:border-border-strong focus:border-cyan-500 dark:border-white/10 dark:bg-slate-950/60 dark:hover:border-white/20 dark:focus:border-cyan-400/50 px-4 py-2 sm:py-2.5 text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-100 file:text-cyan-700 dark:file:bg-cyan-500/10 dark:file:text-cyan-300 file:px-3 file:py-1 file:text-xs file:font-semibold file:cursor-pointer cursor-pointer align-middle file:align-middle outline-none transition disabled:opacity-50"
              />
              <p className="text-[11px] text-muted">
                {tm("attachmentsHint", { max: MAX_REPORT_ATTACHMENTS, limit: UPLOAD_LIMITS_MB.reportAttachment })}
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border dark:border-white/10">
            {uploadStatusText ? (
              <div className="flex items-center gap-2 text-xs text-cyan-600 dark:text-cyan-400 font-medium animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{uploadStatusText}</span>
              </div>
            ) : (
              <span className="text-xs text-muted">{tm("sendToLeaderNotice")}</span>
            )}
            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-xl border border-border bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-foreground dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white px-5 py-2.5 text-sm font-medium transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {tm("cancel")}
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 text-sm font-medium transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-600/25"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                <span>{tm("submit")}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

