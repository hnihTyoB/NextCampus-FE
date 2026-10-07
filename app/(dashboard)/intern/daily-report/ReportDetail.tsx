"use client";

import { useState } from "react";
import {
  FileText,
  Link as LinkIcon,
  Video,
  ExternalLink,
  AlertCircle,
  Download,
  Clock,
  AlertTriangle,
  Compass,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  User,
} from "lucide-react";
import { useTranslations } from "next-intl";
import MetalCard from "@/components/ui/MetalCard";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/auth/useAuth";
import { hasAnyPermission } from "@/lib/portal";
import { useReportAttachments } from "@/hooks/report-attachment/useReportAttachments";
import { useDailyReportFeedback } from "@/hooks/daily-report/useDailyReportFeedback";
import type { DailyReport } from "@/types/daily-report";

type Props = {
  report: DailyReport | null;
  isLoading: boolean;
  missingDate?: string | null;
  onEdit?: (report: DailyReport) => void;
  allowFeedback?: boolean;
  borderless?: boolean;
};

function LeaderFeedbackEditor({
  reportId,
  initialFeedback,
  onDone,
}: {
  reportId: string;
  initialFeedback: string;
  onDone: () => void;
}) {
  const t = useTranslations("leader.dailyReports");
  const [feedbackInput, setFeedbackInput] = useState(initialFeedback);
  const feedbackMutation = useDailyReportFeedback();

  const handleSendFeedback = async () => {
    if (!reportId || !feedbackInput.trim()) return;
    try {
      await feedbackMutation.mutateAsync({
        id: reportId,
        feedback: feedbackInput.trim(),
      });
      onDone();
    } catch {
      // Error handled in hook toast
    }
  };

  return (
    <div className="space-y-3">
      <textarea
        value={feedbackInput}
        onChange={(e) => setFeedbackInput(e.target.value)}
        placeholder={t("feedbackPlaceholder")}
        rows={3}
        className="w-full rounded-2xl border border-white/10 bg-white/5 p-3.5 text-sm text-foreground placeholder:text-muted focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition resize-none custom-scrollbar"
      />
      <div className="flex items-center justify-end gap-2">
        {initialFeedback && (
          <Button variant="glass" size="sm" onClick={onDone}>
            {t("cancel")}
          </Button>
        )}
        <Button
          variant="metal-blue"
          size="sm"
          onClick={handleSendFeedback}
          disabled={feedbackMutation.isPending || !feedbackInput.trim()}
          className="gap-1.5"
        >
          {feedbackMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {initialFeedback ? t("saveFeedback") : t("sendFeedback")}
        </Button>
      </div>
    </div>
  );
}

function DetailCardWrapper({
  borderless,
  children,
}: {
  borderless?: boolean;
  children: React.ReactNode;
}) {
  if (borderless) {
    return (
      <div className="rounded-3xl p-5 sm:p-6 space-y-6 bg-white/[0.02]">
        {children}
      </div>
    );
  }
  return (
    <MetalCard>
      <div className="rounded-3xl p-6 space-y-6">{children}</div>
    </MetalCard>
  );
}

export default function ReportDetail({
  report,
  isLoading,
  missingDate,
  onEdit,
  allowFeedback,
  borderless = false,
}: Props) {
  const t = useTranslations("leader.dailyReports");
  const { state: { user } } = useAuth();
  const isLeader =
    allowFeedback !== undefined
      ? allowFeedback
      : hasAnyPermission(user?.permissions, [
          "DAILY_REPORT_FEEDBACK",
          "DAILY_REPORT_UPDATE",
        ]);

  const { data: attachmentsData } = useReportAttachments(report?.id);
  const attachments =
    report?.attachments && report.attachments.length > 0
      ? report.attachments
      : attachmentsData?.data ?? [];

  const [isEditingFeedback, setIsEditingFeedback] = useState(false);

  if (!report && missingDate) {
    const formatted = new Date(missingDate + "T00:00:00").toLocaleDateString(
      "vi-VN",
      {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh",
      },
    );
    const content = (
      <div className="flex flex-col items-center justify-center min-h-[340px] text-center p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-300 bg-rose-100/80 text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 mb-4">
          <AlertCircle className="h-8 w-8 text-rose-600 dark:text-rose-400" />
        </div>
        <h3 className="text-lg font-semibold text-rose-800 dark:text-rose-300 mb-2">
          {t("missingReport")}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs">{formatted}</p>
        <p className="text-sm text-muted mt-1">
          {t("missingReportDesc")}
        </p>
      </div>
    );
    return borderless ? (
      <div className="rounded-3xl bg-white/[0.02]">{content}</div>
    ) : (
      <MetalCard>{content}</MetalCard>
    );
  }

  if (!report && isLoading) {
    const content = (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded-lg bg-white/5" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded-lg bg-white/5" />
            <div className="h-4 w-3/4 rounded-lg bg-white/5" />
            <div className="h-4 w-1/2 rounded-lg bg-white/5" />
          </div>
        </div>
      </div>
    );
    return borderless ? (
      <div className="rounded-3xl bg-white/[0.02]">{content}</div>
    ) : (
      <MetalCard>{content}</MetalCard>
    );
  }

  if (!report) {
    const content = (
      <div className="flex flex-col items-center justify-center min-h-[340px] text-center p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 mb-4">
          <FileText className="h-8 w-8 text-muted" />
        </div>
        <h3 className="text-lg font-semibold text-slate-300 mb-2">
          {t("noReportSelected")}
        </h3>
        <p className="text-sm text-muted max-w-xs">{t("noReportHint")}</p>
      </div>
    );
    return borderless ? (
      <div className="rounded-3xl bg-white/[0.02]">{content}</div>
    ) : (
      <MetalCard>{content}</MetalCard>
    );
  }

  const reportDateFormatted = new Date(
    report.date || report.createdAt,
  ).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });

  const createdTimeFormatted = new Date(report.createdAt).toLocaleTimeString(
    "vi-VN",
    {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Ho_Chi_Minh",
    },
  );

  return (
    <DetailCardWrapper borderless={borderless}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
              <FileText className="h-5 w-5 text-cyan-400 shrink-0" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              {t("reportTitle")} — {reportDateFormatted}
            </h3>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              <Clock className="h-3 w-3 shrink-0" />
              {t("hoursWorked", { hours: report.hoursWorked ?? 8 })}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-3 text-xs text-muted">
            <span>{t("submittedAt", { time: createdTimeFormatted })}</span>
            {report.intern?.fullName && (
              <>
                <span>•</span>
                <span className="text-slate-300 font-medium">
                  {report.intern.fullName}
                  {report.intern.department?.name && (
                    <span className="text-muted">
                      {" "}
                      ({report.intern.department.name})
                    </span>
                  )}
                </span>
              </>
            )}
          </div>
        </div>

        {onEdit && (
          <Button
            variant="metal-blue"
            size="sm"
            onClick={() => onEdit(report)}
          >
            {t("edit")}
          </Button>
        )}
      </div>

      {/* Work Done / Content */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">
            {t("completedTasks")}
          </h4>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {report.content}
        </div>
      </div>

      {/* Blockers / Khó khăn vướng mắc */}
      {report.blockers && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              {t("blockers")}
            </h4>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/90 leading-relaxed whitespace-pre-wrap">
            {report.blockers}
          </div>
        </div>
      )}

      {/* Next Plan / Kế hoạch ngày mai */}
      {report.nextPlan && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Compass className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              {t("nextPlan")}
            </h4>
          </div>
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-cyan-200/90 leading-relaxed whitespace-pre-wrap">
            {report.nextPlan}
          </div>
        </div>
      )}

      {/* External Links */}
      {(report.prLink || report.videoDemo) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {report.prLink && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">
                {t("prLink")}
              </span>
              <a
                href={report.prLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 transition truncate max-w-full font-mono"
              >
                <LinkIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">{report.prLink}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
          )}

          {report.videoDemo && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">
                {t("videoDemo")}
              </span>
              <a
                href={report.videoDemo}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 transition truncate max-w-full"
              >
                <Video className="h-4 w-4 shrink-0" />
                <span>{t("viewVideo")}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            {t("attachments", { count: attachments.length })}
          </h4>
          <div className="space-y-1.5">
            {attachments.map((att) => (
              <a
                key={att.id}
                href={att.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 hover:bg-white/10 transition group"
              >
                <span className="text-sm text-slate-300 truncate">
                  {att.fileName}
                </span>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {att.fileSize > 0 && (
                    <span className="text-xs text-muted">
                      {Math.round(att.fileSize / 1024)} KB
                    </span>
                  )}
                  <Download className="h-4 w-4 text-muted group-hover:text-cyan-400 transition" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Leader Feedback Section */}
      <div className="pt-4 border-t border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">
              {t("feedbackSectionTitle")}
            </h4>
          </div>
          {isLeader && report.feedback && !isEditingFeedback && (
            <button
              type="button"
              onClick={() => setIsEditingFeedback(true)}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
            >
              {t("editFeedback")}
            </button>
          )}
        </div>

        {/* Existing feedback display */}
        {report.feedback && !isEditingFeedback && (
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-indigo-300/80">
              <div className="flex items-center gap-1.5 font-medium">
                <User className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {report.feedbackUser?.fullName ||
                    report.feedbackBy ||
                    t("leaderRoleFallback")}
                </span>
              </div>
              {report.feedbackAt && (
                <span className="text-muted">
                  {new Date(report.feedbackAt).toLocaleString("vi-VN", {
                    timeZone: "Asia/Ho_Chi_Minh",
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap pl-1">
              {report.feedback}
            </p>
          </div>
        )}

        {/* Empty state for intern if no feedback yet */}
        {!report.feedback && !isLeader && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center text-xs text-muted italic">
            {t("noFeedbackYetIntern")}
          </div>
        )}

        {/* Feedback input form for Leader */}
        {isLeader && (isEditingFeedback || !report.feedback) && (
          <LeaderFeedbackEditor
            key={`${report.id}-${report.feedback ? "edit" : "new"}`}
            reportId={report.id}
            initialFeedback={report.feedback || ""}
            onDone={() => setIsEditingFeedback(false)}
          />
        )}
      </div>
    </DetailCardWrapper>
  );
}
