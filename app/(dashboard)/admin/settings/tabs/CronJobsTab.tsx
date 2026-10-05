"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Clock,
  Search,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Lock,
  PowerOff,
  Play,
} from "lucide-react";
import MetalCard from "@/components/ui/MetalCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import { useRBAC } from "@/hooks/rbac/useRBAC";
import { useCronJobs } from "@/hooks/cron/useCronJobs";
import { useToggleCronJob } from "@/hooks/cron/useToggleCronJob";
import TriggerCronJobModal from "./TriggerCronJobModal";
import type { CronJobItem } from "@/types/cron";

export default function CronJobsTab() {
  const t = useTranslations("admin.settings.cronJobs");
  const { can } = useRBAC();
  const canManage = can("CRON_JOB_MANAGE");

  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<CronJobItem | null>(null);

  const { data: res, isLoading, isError, refetch } = useCronJobs(search || undefined);
  const jobs = res?.data ?? [];

  const toggleMutation = useToggleCronJob();

  if (isLoading) {
    return (
      <div className="flex h-72 w-full flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs font-medium text-muted animate-pulse">
          {t("loading")}
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <MetalCard className="p-8 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-400">
          <AlertCircle className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-foreground">
          {t("loadError")}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {t("retry")}
        </Button>
      </MetalCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <MetalCard className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary-light/30 bg-primary-light/10 text-primary-light shadow-[0_0_20px_rgba(99,102,241,0.15)]">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">{t("title")}</h3>
              <p className="text-xs text-muted mt-0.5">{t("subtitle")}</p>
            </div>
          </div>

          <div className="w-full sm:w-72">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="pl-9 text-xs"
              />
            </div>
          </div>
        </div>

        {!canManage && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-border/40 bg-card/40 p-3 text-xs text-muted">
            <Lock className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              {t.rich("readOnlyPermissionNotice", {
                code: (chunks) => <code className="text-foreground font-mono">{chunks}</code>,
              })}
            </span>
          </div>
        )}
      </MetalCard>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jobs.length === 0 ? (
          <div className="col-span-full">
            <MetalCard className="p-12 text-center text-xs text-muted space-y-2">
              <Clock className="h-8 w-8 mx-auto text-muted/50" />
              <p>{t("emptySearchResults")}</p>
            </MetalCard>
          </div>
        ) : (
          jobs.map((job) => {
            const isToggling =
              toggleMutation.isPending &&
              (typeof toggleMutation.variables === "string"
                ? toggleMutation.variables === job.name
                : toggleMutation.variables?.jobName === job.name);

            return (
              <MetalCard
                key={job.name}
                className={`p-5 flex flex-col justify-between space-y-4 transition-all ${
                  job.isEnabled
                    ? "hover:border-border-strong"
                    : "opacity-60 border-border/30 bg-card/50"
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-mono text-sm font-bold text-foreground tracking-tight truncate">
                        {job.name}
                      </h4>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 mt-1 rounded-md bg-card border border-border/40 text-[11px] font-mono text-primary-light">
                        <Clock className="h-3 w-3" />
                        {job.cron}
                      </span>
                    </div>

                    {/* Status badge */}
                    {job.isEnabled ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                        <CheckCircle2 className="h-3 w-3" />
                        {job.lastStatus || t("statusReady")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 shrink-0">
                        <PowerOff className="h-3 w-3" />
                        {t("statusDisabled")}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted leading-relaxed">
                    {job.description}
                  </p>
                </div>

                {/* Footer with Switch Tắt/Mở & Nút Chạy ngay */}
                <div className="pt-3 border-t border-border/30 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">
                      {t("scheduleToggle")}
                    </span>
                    <span
                      className={`text-[11px] font-semibold transition-colors ${
                        job.isEnabled
                          ? "text-emerald-500 dark:text-emerald-400"
                          : "text-muted"
                      }`}
                    >
                      {job.isEnabled ? t("statusEnabled") : t("statusDisabled")}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {canManage && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedJob(job)}
                        className="text-xs px-2.5 py-1 h-[28px] rounded-lg hover:border-primary-light hover:text-primary-light"
                      >
                        <Play className="h-3 w-3 mr-1 text-primary-light shrink-0" />
                        {t("runNow")}
                      </Button>
                    )}

                    <button
                      type="button"
                      role="switch"
                      id={`cron-switch-${job.name}`}
                      aria-checked={job.isEnabled}
                      aria-label={`${job.name} - ${
                        job.isEnabled ? t("tooltipDisable") : t("tooltipEnable")
                      }`}
                      disabled={!canManage || isToggling}
                      onClick={() =>
                        canManage &&
                        toggleMutation.mutate({
                          jobName: job.name,
                          isEnabled: !job.isEnabled,
                        })
                      }
                      title={
                        !canManage
                          ? t("readOnlyPermissionNotice")
                          : job.isEnabled
                            ? t("tooltipDisable")
                            : t("tooltipEnable")
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-2 focus:ring-offset-background ${
                        !canManage
                          ? "cursor-not-allowed opacity-50"
                          : isToggling
                            ? "cursor-wait opacity-70"
                            : "cursor-pointer"
                      } ${
                        job.isEnabled
                          ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.35)]"
                          : "bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
                      }`}
                    >
                      <span
                        className={`pointer-events-none flex h-4 w-4 transform items-center justify-center rounded-full bg-white shadow-md ring-0 transition-transform duration-300 ease-in-out ${
                          job.isEnabled ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      >
                        {isToggling && (
                          <svg
                            className="h-2.5 w-2.5 animate-spin text-emerald-600 dark:text-emerald-500"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                            />
                          </svg>
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              </MetalCard>
            );
          })
        )}
      </div>

      {/* Trigger Modal */}
      <TriggerCronJobModal
        isOpen={Boolean(selectedJob)}
        onClose={() => setSelectedJob(null)}
        job={selectedJob}
      />
    </div>
  );
}
