"use client";

import React, { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Clock,
  Layers,
  HardDrive,
  Cpu,
  AlertCircle,
  RotateCcw,
  Check,
  Save,
  Loader2,
  Calendar,
  Users,
  Video,
  FileText,
  FileCheck,
  Sparkles,
  GitBranch,
  Bot,
  Eye,
  EyeOff,
  Copy,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import MetalCard from "@/components/ui/MetalCard";
import Spinner from "@/components/ui/Spinner";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import TimePicker from "@/components/ui/TimePicker";
import { useSystemSettings } from "@/hooks/system-setting/useSystemSettings";
import { useBatchUpdateSettings } from "@/hooks/system-setting/useBatchUpdateSettings";
import type { SystemSettings } from "@/types/system-setting";
import SettingsHeader from "./SettingsHeader";
import ResetDefaultsModal from "./ResetDefaultsModal";

const FACTORY_DEFAULTS = {
  DAILY_REPORT_DEADLINE_TIME: "17:30",
  WORKING_DAYS_PER_WEEK: "6",
  MAX_ACTIVE_TASKS: "5",
  MAX_WORKLOAD_DAYS: "14",
  MAX_LEADER_DEPARTMENTS: "3",
  SUBMISSION_MAX_FILE_SIZE_MB: "50",
  REPORT_ATTACHMENT_MAX_SIZE_MB: "10",
  REPORT_VIDEO_MAX_FILE_SIZE_MB: "50",
  TASK_ATTACHMENT_MAX_FILE_SIZE_MB: "25",
  APPLICATION_MAX_FILE_SIZE_MB: "10",
  ALLOW_CROSS_DEPARTMENT_ASSIGNMENT: "true",
  AUTO_EVALUATION_ENABLED: "false",
  DISCORD_BOT_ENABLED: "true",
  DISCORD_BOT_TOKEN: "",
  DISCORD_GUILD_ID: "",
  DISCORD_INVITE_URL: "https://discord.gg/nexcampus",
};

const DEADLINE_PRESETS = ["17:00", "17:30", "18:00", "18:30", "19:00"];

export default function AdminSettingsForm() {
  const t = useTranslations("admin.settings");
  const { data: response, isLoading, isError, refetch } = useSystemSettings();

  if (isLoading) {
    return (
      <div className="flex h-72 w-full flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs font-medium text-muted animate-pulse">
          {t("reloading")}
        </p>
      </div>
    );
  }

  if (isError || !response?.success || !response?.data) {
    return (
      <MetalCard className="p-8 sm:p-12 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400">
          <AlertCircle className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">{t("loadError")}</p>
          <p className="text-xs text-muted max-w-md mx-auto">
            {t("loadErrorDesc")}
          </p>
        </div>
        <Button variant="primary" onClick={() => refetch()} className="mx-auto">
          {t("reloadTooltip")}
        </Button>
      </MetalCard>
    );
  }

  return (
    <AdminSettingsFields
      key={JSON.stringify(response.data)}
      initialData={response.data}
    />
  );
}

interface AdminSettingsFieldsProps {
  initialData: SystemSettings;
}

function AdminSettingsFields({
  initialData,
}: AdminSettingsFieldsProps) {
  const t = useTranslations("admin.settings");
  const batchUpdate = useBatchUpdateSettings();

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Check if today is Sunday in Vietnam timezone (Asia/Ho_Chi_Minh)
  const isSunday = useMemo(() => {
    const vnDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
    return vnDate.getDay() === 0;
  }, []);

  // Parse initial state safely from backend data
  const initialValues = useMemo(() => ({
    DAILY_REPORT_DEADLINE_TIME:
      typeof initialData.NEXT_DAILY_REPORT_DEADLINE_TIME === "string"
        ? initialData.NEXT_DAILY_REPORT_DEADLINE_TIME
        : typeof initialData.DAILY_REPORT_DEADLINE_TIME === "string"
          ? initialData.DAILY_REPORT_DEADLINE_TIME
          : FACTORY_DEFAULTS.DAILY_REPORT_DEADLINE_TIME,
    WORKING_DAYS_PER_WEEK:
      initialData.WORKING_DAYS_PER_WEEK != null
        ? String(initialData.WORKING_DAYS_PER_WEEK)
        : FACTORY_DEFAULTS.WORKING_DAYS_PER_WEEK,
    MAX_ACTIVE_TASKS:
      initialData.MAX_ACTIVE_TASKS != null
        ? String(initialData.MAX_ACTIVE_TASKS)
        : FACTORY_DEFAULTS.MAX_ACTIVE_TASKS,
    MAX_WORKLOAD_DAYS:
      initialData.MAX_WORKLOAD_DAYS != null
        ? String(initialData.MAX_WORKLOAD_DAYS)
        : FACTORY_DEFAULTS.MAX_WORKLOAD_DAYS,
    MAX_LEADER_DEPARTMENTS:
      initialData.MAX_LEADER_DEPARTMENTS != null
        ? String(initialData.MAX_LEADER_DEPARTMENTS)
        : FACTORY_DEFAULTS.MAX_LEADER_DEPARTMENTS,
    SUBMISSION_MAX_FILE_SIZE_MB:
      initialData.SUBMISSION_MAX_FILE_SIZE_MB != null
        ? String(initialData.SUBMISSION_MAX_FILE_SIZE_MB)
        : FACTORY_DEFAULTS.SUBMISSION_MAX_FILE_SIZE_MB,
    REPORT_ATTACHMENT_MAX_SIZE_MB:
      initialData.REPORT_ATTACHMENT_MAX_SIZE_MB != null
        ? String(initialData.REPORT_ATTACHMENT_MAX_SIZE_MB)
        : FACTORY_DEFAULTS.REPORT_ATTACHMENT_MAX_SIZE_MB,
    REPORT_VIDEO_MAX_FILE_SIZE_MB:
      initialData.REPORT_VIDEO_MAX_FILE_SIZE_MB != null
        ? String(initialData.REPORT_VIDEO_MAX_FILE_SIZE_MB)
        : FACTORY_DEFAULTS.REPORT_VIDEO_MAX_FILE_SIZE_MB,
    TASK_ATTACHMENT_MAX_FILE_SIZE_MB:
      initialData.TASK_ATTACHMENT_MAX_FILE_SIZE_MB != null
        ? String(initialData.TASK_ATTACHMENT_MAX_FILE_SIZE_MB)
        : FACTORY_DEFAULTS.TASK_ATTACHMENT_MAX_FILE_SIZE_MB,
    APPLICATION_MAX_FILE_SIZE_MB:
      initialData.APPLICATION_MAX_FILE_SIZE_MB != null
        ? String(initialData.APPLICATION_MAX_FILE_SIZE_MB)
        : FACTORY_DEFAULTS.APPLICATION_MAX_FILE_SIZE_MB,
    ALLOW_CROSS_DEPARTMENT_ASSIGNMENT:
      initialData.ALLOW_CROSS_DEPARTMENT_ASSIGNMENT != null
        ? String(Boolean(initialData.ALLOW_CROSS_DEPARTMENT_ASSIGNMENT))
        : FACTORY_DEFAULTS.ALLOW_CROSS_DEPARTMENT_ASSIGNMENT,
    AUTO_EVALUATION_ENABLED:
      initialData.AUTO_EVALUATION_ENABLED != null
        ? String(Boolean(initialData.AUTO_EVALUATION_ENABLED))
        : FACTORY_DEFAULTS.AUTO_EVALUATION_ENABLED,
    DISCORD_BOT_ENABLED:
      initialData.DISCORD_BOT_ENABLED != null
        ? String(Boolean(initialData.DISCORD_BOT_ENABLED))
        : FACTORY_DEFAULTS.DISCORD_BOT_ENABLED,
    DISCORD_BOT_TOKEN:
      typeof initialData.DISCORD_BOT_TOKEN === "string"
        ? initialData.DISCORD_BOT_TOKEN
        : FACTORY_DEFAULTS.DISCORD_BOT_TOKEN,
    DISCORD_GUILD_ID:
      typeof initialData.DISCORD_GUILD_ID === "string"
        ? initialData.DISCORD_GUILD_ID
        : FACTORY_DEFAULTS.DISCORD_GUILD_ID,
    DISCORD_INVITE_URL:
      typeof initialData.DISCORD_INVITE_URL === "string"
        ? initialData.DISCORD_INVITE_URL
        : FACTORY_DEFAULTS.DISCORD_INVITE_URL,
  }), [initialData]);

  const [formValues, setFormValues] = useState(initialValues);
  const [showBotToken, setShowBotToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const handleCopyToken = () => {
    if (!formValues.DISCORD_BOT_TOKEN) return;
    navigator.clipboard.writeText(formValues.DISCORD_BOT_TOKEN);
    setCopiedToken(true);
    toast.success(t("discordCopyTokenSuccess"));
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleChange = (key: keyof typeof formValues, val: string) => {
    setFormValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleToggle = (
    key:
      | "ALLOW_CROSS_DEPARTMENT_ASSIGNMENT"
      | "AUTO_EVALUATION_ENABLED"
      | "DISCORD_BOT_ENABLED"
  ) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: prev[key] === "true" ? "false" : "true",
    }));
  };

  const handleDiscardChanges = () => {
    setFormValues(initialValues);
  };

  const handleConfirmResetDefaults = () => {
    setFormValues({
      ...FACTORY_DEFAULTS,
      ...(!isSunday && {
        WORKING_DAYS_PER_WEEK:
          initialData.WORKING_DAYS_PER_WEEK != null
            ? String(initialData.WORKING_DAYS_PER_WEEK)
            : FACTORY_DEFAULTS.WORKING_DAYS_PER_WEEK,
      }),
    });
    setIsResetModalOpen(false);
  };

  // Validation rules using localized translations
  const errors = useMemo(() => {
    const errs: Partial<Record<keyof typeof formValues, string>> = {};

    if (!formValues.DAILY_REPORT_DEADLINE_TIME) {
      errs.DAILY_REPORT_DEADLINE_TIME = t("errors.deadlineRequired");
    } else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(formValues.DAILY_REPORT_DEADLINE_TIME)) {
      errs.DAILY_REPORT_DEADLINE_TIME = t("errors.deadlineFormat");
    }

    const workingDaysNum = Number(formValues.WORKING_DAYS_PER_WEEK);
    if (
      isNaN(workingDaysNum) ||
      workingDaysNum < 1 ||
      workingDaysNum > 7 ||
      !Number.isInteger(workingDaysNum)
    ) {
      errs.WORKING_DAYS_PER_WEEK = t("errors.workingDaysRange");
    }

    const tasksNum = Number(formValues.MAX_ACTIVE_TASKS);
    if (isNaN(tasksNum) || tasksNum < 1 || tasksNum > 50) {
      errs.MAX_ACTIVE_TASKS = t("errors.tasksRange");
    }

    const workloadNum = Number(formValues.MAX_WORKLOAD_DAYS);
    if (isNaN(workloadNum) || workloadNum < 1 || workloadNum > 90) {
      errs.MAX_WORKLOAD_DAYS = t("errors.workloadRange");
    }

    const leaderDeptNum = Number(formValues.MAX_LEADER_DEPARTMENTS);
    if (isNaN(leaderDeptNum) || leaderDeptNum < 1 || leaderDeptNum > 10) {
      errs.MAX_LEADER_DEPARTMENTS = t("errors.leaderDeptsRange");
    }

    const submitFileNum = Number(formValues.SUBMISSION_MAX_FILE_SIZE_MB);
    if (isNaN(submitFileNum) || submitFileNum < 5 || submitFileNum > 100) {
      errs.SUBMISSION_MAX_FILE_SIZE_MB = t("errors.submissionSizeRange");
    }

    const reportFileNum = Number(formValues.REPORT_ATTACHMENT_MAX_SIZE_MB);
    if (isNaN(reportFileNum) || reportFileNum < 1 || reportFileNum > 100) {
      errs.REPORT_ATTACHMENT_MAX_SIZE_MB = t("errors.reportAttachmentSizeRange");
    }

    const reportVideoNum = Number(formValues.REPORT_VIDEO_MAX_FILE_SIZE_MB);
    if (isNaN(reportVideoNum) || reportVideoNum < 1 || reportVideoNum > 100) {
      errs.REPORT_VIDEO_MAX_FILE_SIZE_MB = t("errors.reportVideoSizeRange");
    }

    const taskAttachNum = Number(formValues.TASK_ATTACHMENT_MAX_FILE_SIZE_MB);
    if (isNaN(taskAttachNum) || taskAttachNum < 1 || taskAttachNum > 100) {
      errs.TASK_ATTACHMENT_MAX_FILE_SIZE_MB = t("errors.taskAttachmentSizeRange");
    }

    const appFileNum = Number(formValues.APPLICATION_MAX_FILE_SIZE_MB);
    if (isNaN(appFileNum) || appFileNum < 1 || appFileNum > 50) {
      errs.APPLICATION_MAX_FILE_SIZE_MB = t("errors.applicationSizeRange");
    }

    if (formValues.DISCORD_GUILD_ID && formValues.DISCORD_GUILD_ID.trim().length > 0) {
      if (!/^\d{16,21}$/.test(formValues.DISCORD_GUILD_ID.trim())) {
        errs.DISCORD_GUILD_ID = t("errors.discordGuildIdFormat");
      }
    }

    if (formValues.DISCORD_INVITE_URL && formValues.DISCORD_INVITE_URL.trim().length > 0) {
      if (!/^https:\/\/(discord\.(gg|com\/invite)\/[a-zA-Z0-9-]+)/.test(formValues.DISCORD_INVITE_URL.trim())) {
        errs.DISCORD_INVITE_URL = t("errors.discordInviteUrlFormat");
      }
    }

    return errs;
  }, [formValues, t]);

  const hasErrors = Object.keys(errors).length > 0;

  // Track dirty state
  const hasChanges = useMemo(() => {
    return Object.keys(formValues).some((key) => {
      const k = key as keyof typeof formValues;
      return formValues[k] !== initialValues[k];
    });
  }, [formValues, initialValues]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (hasErrors || !hasChanges || batchUpdate.isPending) return;

    // Convert string values to appropriate backend payload
    const payload: Record<string, string | number | boolean> = {
      DAILY_REPORT_DEADLINE_TIME: formValues.DAILY_REPORT_DEADLINE_TIME,
      WORKING_DAYS_PER_WEEK: Number(formValues.WORKING_DAYS_PER_WEEK),
      MAX_ACTIVE_TASKS: Number(formValues.MAX_ACTIVE_TASKS),
      MAX_WORKLOAD_DAYS: Number(formValues.MAX_WORKLOAD_DAYS),
      MAX_LEADER_DEPARTMENTS: Number(formValues.MAX_LEADER_DEPARTMENTS),
      SUBMISSION_MAX_FILE_SIZE_MB: Number(formValues.SUBMISSION_MAX_FILE_SIZE_MB),
      REPORT_ATTACHMENT_MAX_SIZE_MB: Number(formValues.REPORT_ATTACHMENT_MAX_SIZE_MB),
      REPORT_VIDEO_MAX_FILE_SIZE_MB: Number(formValues.REPORT_VIDEO_MAX_FILE_SIZE_MB),
      TASK_ATTACHMENT_MAX_FILE_SIZE_MB: Number(formValues.TASK_ATTACHMENT_MAX_FILE_SIZE_MB),
      APPLICATION_MAX_FILE_SIZE_MB: Number(formValues.APPLICATION_MAX_FILE_SIZE_MB),
      ALLOW_CROSS_DEPARTMENT_ASSIGNMENT: formValues.ALLOW_CROSS_DEPARTMENT_ASSIGNMENT === "true",
      AUTO_EVALUATION_ENABLED: formValues.AUTO_EVALUATION_ENABLED === "true",
      DISCORD_BOT_ENABLED: formValues.DISCORD_BOT_ENABLED === "true",
      DISCORD_BOT_TOKEN: formValues.DISCORD_BOT_TOKEN.trim(),
      DISCORD_GUILD_ID: formValues.DISCORD_GUILD_ID.trim(),
      DISCORD_INVITE_URL: formValues.DISCORD_INVITE_URL.trim(),
    };

    batchUpdate.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* 1. Standardized Cyberpunk Header */}
      <SettingsHeader
        onOpenResetModal={() => setIsResetModalOpen(true)}
        onSave={() => handleSubmit()}
        isPending={batchUpdate.isPending}
        hasErrors={hasErrors}
        hasChanges={hasChanges}
      />

      {/* 2. Unsaved Changes Banner */}
      {hasChanges && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 sm:p-5 backdrop-blur-xl animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                {t("unsavedChanges")}
              </p>
              <p className="text-xs text-muted">
                {t("unsavedDesc")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
            <Button
              type="button"
              variant="glass"
              size="sm"
              onClick={handleDiscardChanges}
              disabled={batchUpdate.isPending}
              className="flex items-center gap-1.5 text-xs h-[38px] px-3"
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0 text-muted" />
              <span>{t("discardChanges")}</span>
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={batchUpdate.isPending || hasErrors}
              className="flex items-center gap-1.5 text-xs h-[38px] px-4 shadow-[0_0_20px_rgba(21,174,245,0.25)]"
            >
              {batchUpdate.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              ) : (
                <Save className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>{batchUpdate.isPending ? t("saving") : t("saveSettings")}</span>
            </Button>
          </div>
        </div>
      )}

      {/* 4. Categorized Form Sections */}
      <div className="space-y-6 sm:space-y-8">
        {/* Category 1: Schedule & Daily Reports */}
        <MetalCard className="p-5 sm:p-7 space-y-5">
          <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                <Clock className="h-5 w-5 shrink-0" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  {t("categories.schedule")}
                </h2>
                <p className="text-xs sm:text-sm text-muted">
                  {t("categories.scheduleDesc")}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div>
              <TimePicker
                label={t("dailyReportDeadlineTitle")}
                value={formValues.DAILY_REPORT_DEADLINE_TIME}
                onChange={(val) => handleChange("DAILY_REPORT_DEADLINE_TIME", val)}
                disabled={batchUpdate.isPending}
                required
                error={errors.DAILY_REPORT_DEADLINE_TIME}
                helperText={t("dailyReportDeadlineDesc")}
              />
            </div>

            {/* Quick Presets for Deadline */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs sm:text-sm font-medium text-foreground/90 select-none flex items-center gap-1">
                {t("quickPresets")}
              </span>
              <div className="flex flex-wrap items-center gap-2 h-[42px] sm:h-[46px]">
                {DEADLINE_PRESETS.map((preset) => {
                  const isSelected = formValues.DAILY_REPORT_DEADLINE_TIME === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleChange("DAILY_REPORT_DEADLINE_TIME", preset)}
                      disabled={batchUpdate.isPending}
                      className={`
                        flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-mono font-semibold
                        transition-all duration-200 cursor-pointer select-none
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
                        ${
                          isSelected
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                            : "border border-border bg-card text-muted hover:border-border-strong hover:text-foreground hover:bg-card-hover"
                        }
                      `}
                    >
                      <Clock className="h-3 w-3 shrink-0" />
                      <span>{preset}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted mt-0.5">
                {t("quickPresetsDeadlineHint")}
              </p>
            </div>

            {/* Next Day Effective Notice if current time passed cutoff */}
            {initialData.NEXT_DAILY_REPORT_DEADLINE_TIME && initialData.DAILY_REPORT_DEADLINE_EFFECTIVE_DATE && (
              <div className="col-span-1 md:col-span-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 sm:p-4 text-amber-300 flex items-start gap-3 animate-fadeIn">
                <Clock className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
                <div className="text-xs sm:text-sm space-y-1">
                  <p className="font-semibold text-foreground">
                    {t("deadlineNextDayNotice", {
                      currentDeadline: initialData.DAILY_REPORT_DEADLINE_TIME ?? "17:30",
                      newDeadline: initialData.NEXT_DAILY_REPORT_DEADLINE_TIME,
                      effectiveDate: initialData.DAILY_REPORT_DEADLINE_EFFECTIVE_DATE,
                    })}
                  </p>
                  <p className="text-muted text-xs">
                    {t("deadlineActiveTodayNotice", {
                      deadline: initialData.DAILY_REPORT_DEADLINE_TIME ?? "17:30",
                    })}
                  </p>
                </div>
              </div>
            )}

            {/* Divider and Working Days Per Week (Sunday-only change rule) */}
            <div className="col-span-1 md:col-span-2 pt-5 border-t border-border/60 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div>
                <Input
                  label={t("workingDaysTitle")}
                  type="number"
                  min={1}
                  max={7}
                  value={formValues.WORKING_DAYS_PER_WEEK}
                  onChange={(e) => handleChange("WORKING_DAYS_PER_WEEK", e.target.value)}
                  disabled={!isSunday || batchUpdate.isPending}
                  required
                  error={errors.WORKING_DAYS_PER_WEEK}
                  helperText={t("workingDaysDesc")}
                  leftIcon={<Calendar className="h-4 w-4" />}
                  rightIcon={
                    <span className="text-xs font-mono font-bold uppercase text-muted select-none">
                      {t("daysPerWeekUnit")}
                    </span>
                  }
                  className="font-mono font-bold"
                />
              </div>

              {/* Presets and Sunday restriction badge */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs sm:text-sm font-medium text-foreground/90 select-none flex items-center gap-1">
                  {t("quickPresets")}
                </span>
                <div className="flex flex-wrap items-center gap-2 h-[42px] sm:h-[46px]">
                  {[
                    { value: "5", label: t("presets5Days") },
                    { value: "6", label: t("presets6Days") },
                  ].map((preset) => {
                    const isSelected = formValues.WORKING_DAYS_PER_WEEK === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handleChange("WORKING_DAYS_PER_WEEK", preset.value)}
                        disabled={!isSunday || batchUpdate.isPending}
                        className={`
                          flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold
                          transition-all duration-200 select-none
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
                          ${
                            !isSunday
                              ? "opacity-50 cursor-not-allowed border border-border bg-card text-muted"
                              : isSelected
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm cursor-pointer"
                                : "border border-border bg-card text-muted hover:border-border-strong hover:text-foreground hover:bg-card-hover cursor-pointer"
                          }
                        `}
                      >
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </MetalCard>

        {/* Category 2: Workload & Task Quotas */}
        <MetalCard className="p-5 sm:p-7 space-y-5">
          <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.15)]">
                <Layers className="h-5 w-5 shrink-0" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  {t("categories.workload")}
                </h2>
                <p className="text-xs sm:text-sm text-muted">
                  {t("categories.workloadDesc")}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {/* Field 1: MAX_ACTIVE_TASKS */}
            <Input
              label={t("maxActiveTasksTitle")}
              type="number"
              min={1}
              max={50}
              value={formValues.MAX_ACTIVE_TASKS}
              onChange={(e) => handleChange("MAX_ACTIVE_TASKS", e.target.value)}
              disabled={batchUpdate.isPending}
              required
              error={errors.MAX_ACTIVE_TASKS}
              helperText={t("maxActiveTasksDesc")}
              leftIcon={<Layers className="h-4 w-4" />}
              rightIcon={
                <span className="text-xs font-mono font-bold uppercase text-muted select-none">
                  {t("tasksUnit")}
                </span>
              }
              className="font-mono font-bold"
            />

            {/* Field 2: MAX_WORKLOAD_DAYS */}
            <Input
              label={t("maxWorkloadDaysTitle")}
              type="number"
              min={1}
              max={90}
              value={formValues.MAX_WORKLOAD_DAYS}
              onChange={(e) => handleChange("MAX_WORKLOAD_DAYS", e.target.value)}
              disabled={batchUpdate.isPending}
              required
              error={errors.MAX_WORKLOAD_DAYS}
              helperText={t("maxWorkloadDaysDesc")}
              leftIcon={<Calendar className="h-4 w-4" />}
              rightIcon={
                <span className="text-xs font-mono font-bold uppercase text-muted select-none">
                  {t("daysUnit")}
                </span>
              }
              className="font-mono font-bold"
            />

            {/* Field 3: MAX_LEADER_DEPARTMENTS */}
            <Input
              label={t("maxLeaderDepartmentsTitle")}
              type="number"
              min={1}
              max={10}
              value={formValues.MAX_LEADER_DEPARTMENTS}
              onChange={(e) => handleChange("MAX_LEADER_DEPARTMENTS", e.target.value)}
              disabled={batchUpdate.isPending}
              required
              error={errors.MAX_LEADER_DEPARTMENTS}
              helperText={t("maxLeaderDepartmentsDesc")}
              leftIcon={<Users className="h-4 w-4" />}
              rightIcon={
                <span className="text-xs font-mono font-bold uppercase text-muted select-none">
                  {t("departmentsUnit")}
                </span>
              }
              className="font-mono font-bold"
            />
          </div>
        </MetalCard>

        {/* Category 3: File Storage & Upload Policies */}
        <MetalCard className="p-5 sm:p-7 space-y-5">
          <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <HardDrive className="h-5 w-5 shrink-0" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  {t("categories.storage")}
                </h2>
                <p className="text-xs sm:text-sm text-muted">
                  {t("categories.storageDesc")}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {/* Field 1: SUBMISSION_MAX_FILE_SIZE_MB */}
            <Input
              label={t("submissionMaxFileSizeTitle")}
              type="number"
              min={5}
              max={100}
              value={formValues.SUBMISSION_MAX_FILE_SIZE_MB}
              onChange={(e) => handleChange("SUBMISSION_MAX_FILE_SIZE_MB", e.target.value)}
              disabled={batchUpdate.isPending}
              required
              error={errors.SUBMISSION_MAX_FILE_SIZE_MB}
              helperText={t("submissionMaxFileSizeDesc")}
              leftIcon={<Video className="h-4 w-4" />}
              rightIcon={
                <span className="text-xs font-mono font-bold uppercase text-muted select-none">
                  {t("mbUnit")}
                </span>
              }
              className="font-mono font-bold"
            />

            {/* Field 2: REPORT_ATTACHMENT_MAX_SIZE_MB */}
            <Input
              label={t("reportAttachmentMaxSizeTitle")}
              type="number"
              min={1}
              max={100}
              value={formValues.REPORT_ATTACHMENT_MAX_SIZE_MB}
              onChange={(e) => handleChange("REPORT_ATTACHMENT_MAX_SIZE_MB", e.target.value)}
              disabled={batchUpdate.isPending}
              required
              error={errors.REPORT_ATTACHMENT_MAX_SIZE_MB}
              helperText={t("reportAttachmentMaxSizeDesc")}
              leftIcon={<FileText className="h-4 w-4" />}
              rightIcon={
                <span className="text-xs font-mono font-bold uppercase text-muted select-none">
                  {t("mbUnit")}
                </span>
              }
              className="font-mono font-bold"
            />

            {/* Field 3: REPORT_VIDEO_MAX_FILE_SIZE_MB */}
            <Input
              label={t("reportVideoMaxSizeTitle")}
              type="number"
              min={1}
              max={100}
              value={formValues.REPORT_VIDEO_MAX_FILE_SIZE_MB}
              onChange={(e) => handleChange("REPORT_VIDEO_MAX_FILE_SIZE_MB", e.target.value)}
              disabled={batchUpdate.isPending}
              required
              error={errors.REPORT_VIDEO_MAX_FILE_SIZE_MB}
              helperText={t("reportVideoMaxSizeDesc")}
              leftIcon={<Video className="h-4 w-4" />}
              rightIcon={
                <span className="text-xs font-mono font-bold uppercase text-muted select-none">
                  {t("mbUnit")}
                </span>
              }
              className="font-mono font-bold"
            />

            {/* Field 4: TASK_ATTACHMENT_MAX_FILE_SIZE_MB */}
            <Input
              label={t("taskAttachmentMaxSizeTitle")}
              type="number"
              min={1}
              max={100}
              value={formValues.TASK_ATTACHMENT_MAX_FILE_SIZE_MB}
              onChange={(e) => handleChange("TASK_ATTACHMENT_MAX_FILE_SIZE_MB", e.target.value)}
              disabled={batchUpdate.isPending}
              required
              error={errors.TASK_ATTACHMENT_MAX_FILE_SIZE_MB}
              helperText={t("taskAttachmentMaxSizeDesc")}
              leftIcon={<FileText className="h-4 w-4" />}
              rightIcon={
                <span className="text-xs font-mono font-bold uppercase text-muted select-none">
                  {t("mbUnit")}
                </span>
              }
              className="font-mono font-bold"
            />

            {/* Field 5: APPLICATION_MAX_FILE_SIZE_MB */}
            <Input
              label={t("applicationMaxSizeTitle")}
              type="number"
              min={1}
              max={50}
              value={formValues.APPLICATION_MAX_FILE_SIZE_MB}
              onChange={(e) => handleChange("APPLICATION_MAX_FILE_SIZE_MB", e.target.value)}
              disabled={batchUpdate.isPending}
              required
              error={errors.APPLICATION_MAX_FILE_SIZE_MB}
              helperText={t("applicationMaxSizeDesc")}
              leftIcon={<FileCheck className="h-4 w-4" />}
              rightIcon={
                <span className="text-xs font-mono font-bold uppercase text-muted select-none">
                  {t("mbUnit")}
                </span>
              }
              className="font-mono font-bold"
            />
          </div>
        </MetalCard>

        {/* Category 4: Automation & Operational Policies */}
        <MetalCard className="p-5 sm:p-7 space-y-5">
          <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                <Cpu className="h-5 w-5 shrink-0" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  {t("categories.automation")}
                </h2>
                <p className="text-xs sm:text-sm text-muted">
                  {t("categories.automationDesc")}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {/* Policy 1: ALLOW_CROSS_DEPARTMENT_ASSIGNMENT */}
            <div
              onClick={() => handleToggle("ALLOW_CROSS_DEPARTMENT_ASSIGNMENT")}
              className={`
                flex items-start justify-between gap-4 rounded-2xl border p-4 sm:p-5
                transition-all duration-300 cursor-pointer select-none
                ${
                  formValues.ALLOW_CROSS_DEPARTMENT_ASSIGNMENT === "true"
                    ? "border-cyan-500/40 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.1)]"
                    : "border-border bg-card hover:border-border-strong hover:bg-card-hover"
                }
              `}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div
                  className={`
                    flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors
                    ${
                      formValues.ALLOW_CROSS_DEPARTMENT_ASSIGNMENT === "true"
                        ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-300"
                        : "border-border bg-card text-muted"
                    }
                  `}
                >
                  <GitBranch className="h-5 w-5 shrink-0" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    {t("allowCrossDepartmentTitle")}
                  </h3>
                  <p className="text-xs text-muted leading-relaxed">
                    {t("allowCrossDepartmentDesc")}
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <div
                className={`
                  relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 mt-1
                  ${
                    formValues.ALLOW_CROSS_DEPARTMENT_ASSIGNMENT === "true"
                      ? "bg-cyan-500"
                      : "bg-slate-700"
                  }
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-md
                    ${
                      formValues.ALLOW_CROSS_DEPARTMENT_ASSIGNMENT === "true"
                        ? "translate-x-6"
                        : "translate-x-1"
                    }
                  `}
                />
              </div>
            </div>

            {/* Policy 2: AUTO_EVALUATION_ENABLED */}
            <div
              onClick={() => handleToggle("AUTO_EVALUATION_ENABLED")}
              className={`
                flex items-start justify-between gap-4 rounded-2xl border p-4 sm:p-5
                transition-all duration-300 cursor-pointer select-none
                ${
                  formValues.AUTO_EVALUATION_ENABLED === "true"
                    ? "border-purple-500/40 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.1)]"
                    : "border-border bg-card hover:border-border-strong hover:bg-card-hover"
                }
              `}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div
                  className={`
                    flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors
                    ${
                      formValues.AUTO_EVALUATION_ENABLED === "true"
                        ? "border-purple-400/40 bg-purple-500/20 text-purple-300"
                        : "border-border bg-card text-muted"
                    }
                  `}
                >
                  <Sparkles className="h-5 w-5 shrink-0" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    {t("autoEvaluationTitle")}
                  </h3>
                  <p className="text-xs text-muted leading-relaxed">
                    {t("autoEvaluationDesc")}
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <div
                className={`
                  relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 mt-1
                  ${
                    formValues.AUTO_EVALUATION_ENABLED === "true"
                      ? "bg-purple-500"
                      : "bg-slate-700"
                  }
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-md
                    ${
                      formValues.AUTO_EVALUATION_ENABLED === "true"
                        ? "translate-x-6"
                        : "translate-x-1"
                    }
                  `}
                />
              </div>
            </div>
          </div>
        </MetalCard>

        {/* Category 5: Discord Integration & Automation */}
        <MetalCard className="p-5 sm:p-7 space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                <Bot className="h-5 w-5 shrink-0" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  {t("categories.discord")}
                </h2>
                <p className="text-xs sm:text-sm text-muted">
                  {t("categories.discordDesc")}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Master Bot Automation Toggle */}
            <div
              onClick={() => handleToggle("DISCORD_BOT_ENABLED")}
              className={`
                flex items-start justify-between gap-4 rounded-2xl border p-4 sm:p-5
                transition-all duration-300 cursor-pointer select-none
                ${
                  formValues.DISCORD_BOT_ENABLED === "true"
                    ? "border-indigo-500/40 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.1)]"
                    : "border-border bg-card hover:border-border-strong hover:bg-card-hover"
                }
              `}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div
                  className={`
                    flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors
                    ${
                      formValues.DISCORD_BOT_ENABLED === "true"
                        ? "border-indigo-400/40 bg-indigo-500/20 text-indigo-300"
                        : "border-border bg-card text-muted"
                    }
                  `}
                >
                  <Bot className="h-5 w-5 shrink-0" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-foreground">
                      {t("discordBotEnabledTitle")}
                    </h3>
                    <span
                      className={`
                        inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide
                        ${
                          formValues.DISCORD_BOT_ENABLED === "true"
                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                            : "bg-slate-500/10 text-muted border border-border"
                        }
                      `}
                    >
                      {formValues.DISCORD_BOT_ENABLED === "true" ? t("enabled") : t("disabled")}
                    </span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    {t("discordBotEnabledDesc")}
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <div
                className={`
                  relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 mt-1
                  ${
                    formValues.DISCORD_BOT_ENABLED === "true"
                      ? "bg-indigo-500"
                      : "bg-slate-700"
                  }
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-md
                    ${
                      formValues.DISCORD_BOT_ENABLED === "true"
                        ? "translate-x-6"
                        : "translate-x-1"
                    }
                  `}
                />
              </div>
            </div>

            {/* Discord Server Invite URL */}
            <div className="pt-2">
              <Input
                label={t("discordInviteUrlTitle")}
                type="url"
                placeholder={t("discordInviteUrlPlaceholder")}
                value={formValues.DISCORD_INVITE_URL}
                onChange={(e) => handleChange("DISCORD_INVITE_URL", e.target.value)}
                disabled={batchUpdate.isPending}
                error={errors.DISCORD_INVITE_URL}
                helperText={t("discordInviteUrlDesc")}
              />
            </div>

            {/* Server ID & Bot Token Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pt-2">
              <div>
                <Input
                  label={t("discordGuildIdTitle")}
                  type="text"
                  placeholder={t("discordGuildIdPlaceholder")}
                  value={formValues.DISCORD_GUILD_ID}
                  onChange={(e) => handleChange("DISCORD_GUILD_ID", e.target.value)}
                  disabled={batchUpdate.isPending}
                  error={errors.DISCORD_GUILD_ID}
                  helperText={t("discordGuildIdDesc")}
                />
              </div>

              {/* Bot Token with Reveal & Copy */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-medium text-foreground/90 select-none flex items-center justify-between">
                  <span>{t("discordBotTokenTitle")}</span>
                  {formValues.DISCORD_BOT_TOKEN && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowBotToken(!showBotToken)}
                        className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-card-hover"
                        title={showBotToken ? t("discordHideToken") : t("discordShowToken")}
                      >
                        {showBotToken ? (
                          <>
                            <EyeOff className="h-3 w-3" />
                            <span>{t("discordHideToken")}</span>
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3" />
                            <span>{t("discordShowToken")}</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyToken}
                        className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors px-1.5 py-0.5 rounded hover:bg-indigo-500/10"
                        title={t("discordCopyToken")}
                      >
                        {copiedToken ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">{t("discordCopied")}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>{t("discordCopy")}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </label>
                <div className="relative">
                  <Input
                    type={showBotToken ? "text" : "password"}
                    placeholder={t("discordBotTokenPlaceholder")}
                    value={formValues.DISCORD_BOT_TOKEN}
                    onChange={(e) => handleChange("DISCORD_BOT_TOKEN", e.target.value)}
                    disabled={batchUpdate.isPending}
                    error={errors.DISCORD_BOT_TOKEN}
                    helperText={t("discordBotTokenDesc")}
                    className="font-mono text-xs pr-10"
                  />
                </div>
              </div>
            </div>

            {/* Auto Webhook Provisioning Notice Box */}
            <div className="pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-2xl border border-indigo-500/25 bg-indigo-500/10 p-4 sm:p-5 backdrop-blur-md">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-semibold text-foreground">
                      {t("discordAutoWebhookTitle")}
                    </p>
                    <p className="text-xs text-muted leading-relaxed">
                      {t("discordAutoWebhookNotice")}
                    </p>
                  </div>
                </div>

                <Link
                  href="/admin/discord"
                  className="inline-flex items-center gap-1.5 shrink-0 self-start sm:self-center rounded-xl border border-indigo-500/30 bg-indigo-500/15 hover:bg-indigo-500/25 px-3.5 py-2 text-xs font-semibold text-indigo-300 transition-all shadow-sm"
                >
                  <span>{t("discordManageWebhooksLink")}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </Link>
              </div>
            </div>

            {/* Security Notice Box */}
            <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card/60 p-3.5 text-xs text-muted">
              <ShieldCheck className="h-4 w-4 shrink-0 text-indigo-400" />
              <span>{t("discordSecurityNotice")}</span>
            </div>
          </div>
        </MetalCard>
      </div>

      {/* 5. Subtitle Note */}
      <div className="flex items-center gap-2 text-xs text-muted pt-2">
        <Check className="h-4 w-4 text-emerald-400 shrink-0" />
        <span>{t("validationGuaranteeNotice")}</span>
      </div>

      {/* 6. Reset Defaults Modal */}
      <ResetDefaultsModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleConfirmResetDefaults}
        isPending={batchUpdate.isPending}
      />
    </form>
  );
}
