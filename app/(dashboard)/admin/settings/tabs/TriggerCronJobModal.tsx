"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useTriggerCronJob } from "@/hooks/cron/useTriggerCronJob";
import type { CronJobItem, CronJobExecutionResult } from "@/types/cron";

interface TriggerCronJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: CronJobItem | null;
}

export default function TriggerCronJobModal({
  isOpen,
  onClose,
  job,
}: TriggerCronJobModalProps) {
  const t = useTranslations("admin.settings.cronJobs");
  const [retentionDays, setRetentionDays] = useState("30");
  const [result, setResult] = useState<CronJobExecutionResult | null>(null);

  const triggerMutation = useTriggerCronJob({
    onSuccess: (data) => {
      setResult(data);
    },
  });

  if (!job) return null;

  const handleTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    const payloadParams: Record<string, unknown> = {};
    if (job.name === "cleanup-audit-logs" && retentionDays) {
      payloadParams.retentionDays = Number(retentionDays);
    }

    triggerMutation.mutate({
      jobName: job.name,
      payload: Object.keys(payloadParams).length > 0 ? { params: payloadParams } : undefined,
    });
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("triggerModal.title", { jobName: job.name })}
      size="md"
    >
      <div className="space-y-4 px-1 py-1">
        {/* Job Details Card */}
        <div className="p-3.5 rounded-xl border border-border/40 bg-card/40 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-foreground text-sm">
              {job.name}
            </span>
            <span className="px-2 py-0.5 rounded bg-primary-light/10 text-primary-light border border-primary-light/20 font-mono text-[11px]">
              {job.cron}
            </span>
          </div>
          <p className="text-muted">{job.description}</p>
        </div>

        {/* Custom params if any */}
        {job.name === "cleanup-audit-logs" && !result && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted">
              {t("triggerModal.retentionDaysLabel")}
            </label>
            <Input
              type="number"
              min={1}
              max={365}
              value={retentionDays}
              onChange={(e) => setRetentionDays(e.target.value)}
              disabled={triggerMutation.isPending}
            />
            <p className="text-[11px] text-muted">
              {t("triggerModal.retentionDaysHint")}
            </p>
          </div>
        )}

        {/* Result view */}
        {result && (
          <div
            className={`p-4 rounded-xl border space-y-3 ${
              result.success
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-red-500/30 bg-red-500/10"
            }`}
          >
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
              <h5
                className={`text-xs font-bold uppercase tracking-wider ${
                  result.success ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {result.success ? t("triggerModal.executionSuccess") : t("triggerModal.executionFailed")}
              </h5>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-muted">
                {t("triggerModal.duration")}{" "}
                <strong className="text-foreground font-mono">
                  {result.durationMs}ms
                </strong>
              </div>
              <div className="text-muted">
                {t("triggerModal.status")}{" "}
                <strong className="text-foreground">
                  {result.success ? "SUCCESS" : "FAILED"}
                </strong>
              </div>
            </div>

            {result.data && (
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-muted">
                  {t("triggerModal.responseData")}
                </span>
                <pre className="p-2.5 rounded-lg bg-background/80 border border-border/40 font-mono text-[11px] text-foreground overflow-x-auto max-h-36">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            )}

            {result.error && (
              <div className="text-xs text-red-300">
                {t("triggerModal.error", { error: result.error })}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2.5 pt-3 border-t border-border/40">
          <Button variant="outline" size="sm" onClick={handleClose}>
            {result ? t("triggerModal.close") : t("triggerModal.cancel")}
          </Button>

          {!result && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleTrigger}
              disabled={triggerMutation.isPending}
            >
              {triggerMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Play className="h-4 w-4 mr-1.5" />
              )}
              {triggerMutation.isPending ? t("running") : t("runNow")}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
