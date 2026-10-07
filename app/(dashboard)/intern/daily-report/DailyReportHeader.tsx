"use client";

import { useMemo } from "react";
import { FileText, Clock, CheckCircle2, AlertTriangle, Plus, RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import MetalCard from "@/components/ui/MetalCard";
import Button from "@/components/ui/Button";
import { useDailyReports } from "@/hooks/daily-report/useDailyReports";
import { useSystemSettings } from "@/hooks/system-setting/useSystemSettings";
import { useRBAC } from "@/hooks/rbac/useRBAC";
import type { DailyReport } from "@/types/daily-report";

type Props = {
  onOpenCreate: () => void;
  onOpenEdit: (report: DailyReport) => void;
  onReload?: () => void;
  isReloading?: boolean;
};

export default function DailyReportHeader({
  onOpenCreate,
  onOpenEdit,
  onReload,
  isReloading = false,
}: Props) {
  const t = useTranslations("intern.dailyReport");
  const { can } = useRBAC();
  const canCreate = can("DAILY_REPORT_CREATE");
  const canUpdate = can("DAILY_REPORT_UPDATE");

  // Fetch operational system settings (dynamic daily report cutoff deadline)
  const { data: settingsData } = useSystemSettings();
  const activeDeadline = settingsData?.data?.DAILY_REPORT_DEADLINE_TIME ?? "17:30";
  const nextDeadline = settingsData?.data?.NEXT_DAILY_REPORT_DEADLINE_TIME;
  const nextEffectiveDate = settingsData?.data?.DAILY_REPORT_DEADLINE_EFFECTIVE_DATE;

  const [deadlineHour, deadlineMinute] = useMemo(() => {
    const parts = (activeDeadline || "17:30").split(":").map(Number);
    return [parts[0] ?? 17, parts[1] ?? 30];
  }, [activeDeadline]);

  // Format date and time in Asia/Ho_Chi_Minh
  const { todayStr, isPastCutoff } = useMemo(() => {
    const now = new Date();
    const vnDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(now);
    const vnTimeStr = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);
    const [vnHour, vnMinute] = vnTimeStr.split(":").map(Number);
    const past = vnHour > deadlineHour || (vnHour === deadlineHour && vnMinute >= deadlineMinute);
    return { todayStr: vnDateStr, isPastCutoff: past };
  }, [deadlineHour, deadlineMinute]);

  const { data, isPending } = useDailyReports({
    from: todayStr,
    to: todayStr,
    limit: 1,
  });
  const existingReport = (data?.data ?? data?.items)?.[0];
  const hasReportedToday = !!existingReport;

  return (
    <div className="space-y-4">
      <MetalCard>
        <div className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <FileText className="h-6 w-6 shrink-0 text-cyan-400" />
                <h2 className="text-2xl font-bold metal-text">{t("title")}</h2>
              </div>
              <p className="mt-1 text-sm text-muted">{t("description")}</p>
            </div>

            <div className="flex items-center gap-3">
              {onReload && (
                <button
                  type="button"
                  onClick={onReload}
                  disabled={isReloading}
                  title={t("reloadTooltip")}
                  aria-label={t("reloadTooltip")}
                  className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-100/80 text-slate-700 hover:text-cyan-600 hover:bg-cyan-50 hover:border-cyan-300 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:border-cyan-400/30 dark:hover:bg-cyan-500/10 dark:hover:text-cyan-300 px-4 py-2 text-xs sm:text-sm font-medium transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RotateCw
                    className={`h-4 w-4 shrink-0 transition-transform ${
                      isReloading ? "animate-spin text-cyan-500 dark:text-cyan-400" : ""
                    }`}
                  />
                  <span className="hidden sm:inline">{t("reloadTooltip")}</span>
                </button>
              )}

              {isPending ? (
                <Button variant="metal-silver" size="md" isLoading disabled />
              ) : hasReportedToday ? (
                canUpdate && (
                  <Button
                    variant="metal-blue"
                    size="md"
                    onClick={() => onOpenEdit(existingReport!)}
                    className="active:scale-95 shadow-sm"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    <span>{t("editReport")}</span>
                  </Button>
                )
              ) : (
                canCreate && (
                  <Button
                    variant="metal-blue"
                    size="md"
                    onClick={onOpenCreate}
                    className="active:scale-95 shadow-sm"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span>{t("createReport")}</span>
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      </MetalCard>

      {/* Cut-off Deadline Banner (17:30 Hạn chốt nộp báo cáo) */}
      {!isPending && (
        <div>
          {hasReportedToday ? (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50/90 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 p-4 animate-fadeIn">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-200">
                  {t("reportedTodayTitle", { date: todayStr })}
                </p>
                <p className="text-xs text-emerald-800 dark:text-emerald-400/80 mt-0.5">
                  {t("reportedTodayDesc")}
                </p>
              </div>
              {canUpdate && (
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => onOpenEdit(existingReport!)}
                >
                  {t("editReport")}
                </Button>
              )}
            </div>
          ) : isPastCutoff ? (
            <div className="flex items-center gap-3 rounded-2xl border border-rose-300 bg-rose-50/90 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300 p-4 animate-fadeIn">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 animate-bounce" />
              <div className="flex-1">
                <p className="text-sm font-bold text-rose-950 dark:text-rose-200">
                  {t("pastCutoffTitle", { time: activeDeadline })}
                </p>
                <p className="text-xs text-rose-800 dark:text-rose-300/80 mt-0.5">
                  {t("pastCutoffDesc", { date: todayStr })}
                </p>
                {nextDeadline && nextEffectiveDate && (
                  <p className="text-[11px] text-rose-700 dark:text-rose-300/70 mt-1 italic">
                    {t("nextDayEffectiveNotice", {
                      nextTime: nextDeadline,
                      date: nextEffectiveDate,
                    })}
                  </p>
                )}
              </div>
              {canCreate && (
                <Button variant="danger" size="sm" onClick={onOpenCreate}>
                  {t("submitLateNow")}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 p-4 animate-fadeIn">
              <Clock className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-950 dark:text-amber-200">
                  {t("beforeCutoffTitle", { time: activeDeadline, date: todayStr })}
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300/80 mt-0.5">
                  {t("beforeCutoffDesc", { time: activeDeadline })}
                </p>
                {nextDeadline && nextEffectiveDate && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300/70 mt-1 italic">
                    {t("nextDayEffectiveNotice", {
                      nextTime: nextDeadline,
                      date: nextEffectiveDate,
                    })}
                  </p>
                )}
              </div>
              {canCreate && (
                <Button variant="metal-blue" size="sm" onClick={onOpenCreate}>
                  {t("createReport")}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
