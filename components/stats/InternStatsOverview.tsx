"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/hooks/auth/useAuth";
import { useInternStats } from "@/hooks/stats/useInternStats";
import { useSystemSettings } from "@/hooks/system-setting/useSystemSettings";
import StatsCard from "./StatsCard";
import InternActivityHeatmap from "./InternActivityHeatmap";
import Spinner from "../ui/Spinner";
import MetalCard from "../ui/MetalCard";
import RejectedSubmissionsCard from "./RejectedSubmissionsCard";
import Table from "../ui/Table";
import {
  ClipboardList,
  CheckCircle2,
  Calendar,
  Award,
  ExternalLink,
  Clock,
  RotateCw,
  AlertCircle,
  AlertTriangle,
  GraduationCap,
  ShieldCheck,
  Zap,
  ListTodo,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import type { AssignmentDetail } from "@/types/stats";

export default function InternStatsOverview() {
  const t = useTranslations("intern.dashboard");
  const locale = useLocale();
  const { state: authState } = useAuth();
  const { data: response, isLoading, isError, isFetching, refetch } = useInternStats();
  const { data: settingsData } = useSystemSettings();
  const activeDeadline = settingsData?.data?.DAILY_REPORT_DEADLINE_TIME ?? "17:30";

  if (isLoading) {
    return (
      <MetalCard className="p-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Spinner size="lg" />
          <p className="text-sm text-muted">
            {locale === "vi" ? "Đang tải dữ liệu tổng quan..." : "Loading dashboard overview..."}
          </p>
        </div>
      </MetalCard>
    );
  }

  if (isError || !response?.success) {
    return (
      <MetalCard className="p-8 sm:p-10">
        <div className="flex flex-col items-center justify-center text-center space-y-4 max-w-lg mx-auto">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.2)]">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xl font-bold text-foreground">
              {t("loadError")}
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              {response?.message ||
                (locale === "vi"
                  ? "Không thể lấy dữ liệu thống kê từ máy chủ. Vui lòng kiểm tra lại quyền hạn hoặc kết nối mạng và thử lại."
                  : "Unable to retrieve statistics from the server. Please check your permissions or network connection and try again.")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-lg disabled:opacity-50 active:scale-95"
          >
            <RotateCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            {t("retry")}
          </button>
        </div>
      </MetalCard>
    );
  }

  const stats = response.data;
  const todaysTasks = Array.isArray(stats?.todaysTasks) ? stats.todaysTasks : [];

  const tasksCompleted = stats?.tasks?.completedTasks ?? stats?.tasksCompleted ?? 0;
  const tasksBlocked = stats?.tasks?.blockedTasks ?? 0;
  const tasksOverdue = stats?.tasks?.overdueTasks ?? stats?.tasksOverdue ?? 0;
  const tasksInProgress = stats?.tasks?.inProgressTasks ?? stats?.tasksInProgress ?? 0;
  const totalTasks =
    stats?.tasks?.totalTasks ??
    stats?.totalTasks ??
    (tasksCompleted + tasksInProgress + tasksBlocked + tasksOverdue);
  const completionRate =
    stats?.tasks?.completionRate ??
    stats?.completionRate ??
    (totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0);

  const isTodayReportSubmitted =
    stats?.reports?.dailyReportTodaySubmitted ?? stats?.dailyReportTodaySubmitted ?? false;
  const avgScore = stats?.evaluations?.avgScore ?? stats?.avgScore ?? 0;
  const lastWeekScore = stats?.evaluations?.lastWeekScore ?? stats?.lastWeekScore ?? null;
  const needsReworkItems = Array.isArray(stats?.needsRework) ? stats.needsRework : [];

  const internDisplayName = stats?.internName || authState?.user?.fullName || "Thực tập sinh";

  // Task status distribution for Donut Chart
  const donutData = [
    {
      name: t("taskStatusDone"),
      value: tasksCompleted,
      color: "#10b981", // Emerald
    },
    {
      name: t("taskStatusInProgress"),
      value: tasksInProgress,
      color: "#06b6d4", // Cyan
    },
    {
      name: t("taskStatusBlocked"),
      value: tasksBlocked,
      color: "#f59e0b", // Amber
    },
    {
      name: t("taskStatusOverdue"),
      value: tasksOverdue,
      color: "#f43f5e", // Rose
    },
  ];

  const totalDonutValue = donutData.reduce((acc, curr) => acc + curr.value, 0);
  const displayDonutData =
    totalDonutValue > 0
      ? donutData.filter((d) => d.value > 0)
      : [{ name: t("totalTasksLabel"), value: 1, color: "#334155" }];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Tier 1: Executive Header Banner */}
      <MetalCard>
        <div className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-light/10 text-primary-light border border-primary-light/20 shrink-0 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                  <GraduationCap className="h-5 w-5 shrink-0" />
                </div>
                <h1 className="text-2xl font-bold metal-text">
                  {t("greeting", { name: internDisplayName })}
                </h1>
              </div>
              <p className="mt-1 text-sm text-muted">
                {t("welcome")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              {/* Live Status Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-300/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-400 text-xs font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{t("liveBadge")}</span>
              </div>

              {/* Fast Reload Button */}
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                title={t("reloadTooltip")}
                aria-label={t("reloadTooltip")}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-100/80 text-slate-600 hover:text-cyan-600 hover:bg-cyan-50 dark:border-white/10 dark:bg-white/5 dark:text-muted dark:hover:text-cyan-400 dark:hover:bg-white/10 transition-all active:scale-90 disabled:opacity-50 cursor-pointer"
              >
                <RotateCw className={`h-4 w-4 ${isFetching ? "animate-spin text-cyan-600 dark:text-cyan-400" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </MetalCard>

      {/* Daily Report Deadline Notice Card */}
      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border p-4 transition-all duration-300 ${
          isTodayReportSubmitted
            ? "border-emerald-300/80 bg-emerald-50/80 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
            : "border-amber-300/80 bg-amber-50/80 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 shadow-sm dark:shadow-[0_0_24px_rgba(245,158,11,0.1)]"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
              isTodayReportSubmitted
                ? "bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
                : "bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30"
            }`}
          >
            {isTodayReportSubmitted ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  isTodayReportSubmitted
                    ? "border-emerald-300 bg-emerald-100/80 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300"
                    : "border-amber-300 bg-amber-100/80 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300"
                }`}
              >
                {isTodayReportSubmitted
                  ? t("reportSubmittedBadge")
                  : t("reportNotSubmittedBadge")}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium mt-0.5 text-foreground">
              {isTodayReportSubmitted
                ? t("reportSubmittedMsg")
                : t("deadlineNotice", { time: activeDeadline })}
            </p>
          </div>
        </div>

        {!isTodayReportSubmitted && (
          <Link
            href="/intern/daily-report"
            className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-xs shadow-soft hover:opacity-95 transition-all"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>{t("submitNow")}</span>
          </Link>
        )}
      </div>

      {/* Tier 2: 4 Core Headline KPI Cards (Aligned with Golden Ratio 4-Card Standard) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-5">
        <StatsCard
          title={t("tasksInProgress")}
          value={tasksInProgress}
          subtitle={t("totalTasks", { n: totalTasks })}
          icon={<ClipboardList className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />}
          href="/intern/task"
          trend={{ text: t("completionRate", { n: completionRate }), positive: true }}
        />

        <StatsCard
          title={t("tasksCompleted")}
          value={tasksCompleted}
          subtitle={t("tasksCompletedSubtitle", { done: tasksCompleted, total: totalTasks })}
          icon={<CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />}
          href="/intern/task?status=DONE"
          trend={{
            text: tasksBlocked > 0 ? `${tasksBlocked} ${t("needsUnblockSupport")}` : t("updateProgress"),
            positive: tasksBlocked === 0,
          }}
        />

        <StatsCard
          title={t("tasksOverdue")}
          value={tasksOverdue}
          subtitle={tasksOverdue > 0 ? t("tasksOverdueSubtitle", { n: tasksOverdue }) : t("noOverdueTasks")}
          icon={<AlertTriangle className={`h-6 w-6 ${tasksOverdue > 0 ? "text-rose-600 dark:text-rose-400 animate-pulse" : "text-emerald-600 dark:text-emerald-400"}`} />}
          href="/intern/task?status=OVERDUE"
          trend={{
            text: tasksOverdue > 0 ? t("needsUrgentAction") : t("onTrack"),
            positive: tasksOverdue === 0,
          }}
        />

        <StatsCard
          title={t("weeklyScore")}
          value={typeof lastWeekScore === "number" ? `${lastWeekScore.toFixed(1)}/10` : `${avgScore.toFixed(1)}/10`}
          subtitle={t("avgScore", { score: avgScore.toFixed(1) })}
          icon={<Award className="h-6 w-6 text-purple-600 dark:text-purple-400" />}
          href="/intern/weekly-evaluation"
          trend={{ text: t("scoreResults"), positive: avgScore >= 7 }}
        />
      </div>

      {/* Activity Heatmap: Contribution Calendar / Streak */}
      <InternActivityHeatmap activity={stats?.activity} />

      {/* Tier 3: Analytics Row (Golden Ratio 65% / 35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (65% -> col-span-8): Operations & Detail */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          {/* Action Alert: Rejected Submissions Needing Rework */}
          {needsReworkItems.length > 0 && (
            <RejectedSubmissionsCard needsReworkItems={needsReworkItems} />
          )}

          {/* Today's Tasks & Assignments Table */}
          <MetalCard className="p-6 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                      <Clock className="h-5 w-5 shrink-0" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      <span className="metal-text">{t("tasksToDos")}</span>
                    </h3>
                  </div>
                  <p className="text-xs text-muted mt-1.5">{t("recentlyAssigned")}</p>
                </div>
                <Link
                  href="/intern/task"
                  className="text-xs text-primary-light hover:text-cyan-300 font-semibold flex items-center gap-1 px-3 py-1.5 rounded-xl border border-primary-light/20 bg-primary-light/5 hover:bg-primary-light/10 transition-all"
                >
                  {t("viewAllTasks")}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              <div className="mt-6">
                <Table columns="2.2fr 1fr 1.6fr 1fr" className="border-0 shadow-none rounded-none bg-transparent">
                  <Table.Header>
                    <span>{t("colTaskName")}</span>
                    <span>{t("colPriority")}</span>
                    <span>{t("colStatusDeadline")}</span>
                    <div className="flex items-center justify-end">
                      <Table.ReloadButton onReload={refetch} isReloading={isFetching} />
                    </div>
                  </Table.Header>

                  <Table.Body
                    data={todaysTasks.slice(0, 5)}
                    emptyMessage={t("noTasksToday")}
                    render={(task: AssignmentDetail) => {
                      const deadlineText = task.taskDeadline
                        ? new Date(task.taskDeadline).toLocaleDateString(
                            locale === "vi" ? "vi-VN" : "en-US",
                            { day: "2-digit", month: "2-digit", year: "numeric" },
                          )
                        : "—";

                      return (
                        <Table.Row key={task.id}>
                          <div className="min-w-0 pr-2">
                            <p className="font-semibold text-foreground text-sm truncate">
                              {task.taskTitle}
                            </p>
                            <p className="text-xs text-muted truncate">
                              {t("leader")} {task.leaderName || "Leader"}
                            </p>
                          </div>

                          <div>
                            <span
                              className={`inline-block text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
                                task.taskPriority === "HIGH"
                                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                  : task.taskPriority === "MEDIUM"
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              }`}
                            >
                              {task.taskPriority || "NORMAL"}
                            </span>
                          </div>

                          <div>
                            <div className="flex flex-col gap-0.5">
                              <span
                                className={`inline-flex w-fit items-center text-[11px] font-semibold px-2 py-0.5 rounded-lg border ${
                                  task.status === "DONE"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : task.status === "IN_PROGRESS"
                                      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                                      : task.status === "REVIEW"
                                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                        : "bg-slate-500/10 text-slate-300 border-slate-500/20"
                                }`}
                              >
                                {task.status}
                              </span>
                              <span className="text-[11px] text-muted">{deadlineText}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end">
                            <Link
                              href={`/intern/task`}
                              className="text-xs text-primary-light hover:underline font-medium inline-flex items-center gap-1"
                            >
                              {t("viewTaskDetails")}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                        </Table.Row>
                      );
                    }}
                  />
                </Table>
              </div>
            </div>
          </MetalCard>
        </div>

        {/* Right Column (35% -> col-span-4): Donut Chart & Quick Actions */}
        <div className="lg:col-span-4 flex flex-col">
          <MetalCard className="p-6 flex-1 flex flex-col justify-between space-y-6">
            <div>
              {/* Task Status Heading */}
              <div className="border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">
                    <span className="metal-text">{t("taskStatusBreakdown")}</span>
                  </h3>
                </div>
                <p className="text-xs text-muted mt-1.5">{t("taskStatusSubtitle")}</p>
              </div>

              {/* Recharts Donut Chart */}
              <div className="relative mt-4 h-48 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={displayDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={78}
                      paddingAngle={totalDonutValue > 0 ? 4 : 0}
                      dataKey="value"
                      stroke="none"
                    >
                      {displayDonutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.95)",
                        borderColor: "rgba(255, 255, 255, 0.12)",
                        borderRadius: "0.75rem",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.6)",
                        color: "#f8fafc",
                        backdropFilter: "blur(8px)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Completion Rate Counter */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-extrabold chrome-text leading-none tracking-tight">
                    {completionRate}%
                  </span>
                  <span className="text-[11px] font-semibold text-muted mt-1 uppercase tracking-wider">
                    {t("completed")}
                  </span>
                </div>
              </div>

              {/* Status Chips Grid */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center">
                  <p className="text-[10px] text-emerald-400 font-medium truncate">{t("taskStatusDone")}</p>
                  <p className="text-sm font-bold text-emerald-300 mt-0.5">{tasksCompleted}</p>
                </div>
                <div className="p-2.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-center">
                  <p className="text-[10px] text-cyan-400 font-medium truncate">{t("taskStatusInProgress")}</p>
                  <p className="text-sm font-bold text-cyan-300 mt-0.5">{tasksInProgress}</p>
                </div>
                <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-center">
                  <p className="text-[10px] text-amber-400 font-medium truncate">{t("taskStatusBlocked")}</p>
                  <p className="text-sm font-bold text-amber-300 mt-0.5">{tasksBlocked}</p>
                </div>
                <div className="p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-center">
                  <p className="text-[10px] text-rose-400 font-medium truncate">{t("taskStatusOverdue")}</p>
                  <p className="text-sm font-bold text-rose-300 mt-0.5">{tasksOverdue}</p>
                </div>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                  <Zap className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-foreground">{t("quickActions")}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Action 1: Submit Daily Report */}
                <Link
                  href="/intern/daily-report"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-indigo-500/25 bg-indigo-500/5 hover:bg-indigo-500/15 hover:border-indigo-500/40 transition-all group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Calendar className="h-4 w-4 text-indigo-400 shrink-0" />
                    <span className="text-xs font-medium text-foreground group-hover:text-indigo-300 transition-colors truncate">
                      {t("actionSubmitReport")}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                      isTodayReportSubmitted
                        ? "text-emerald-400 bg-emerald-500/20"
                        : "text-amber-400 bg-amber-500/20"
                    }`}
                  >
                    {isTodayReportSubmitted ? "✓" : "!"}
                  </span>
                </Link>

                {/* Action 2: Task Board */}
                <Link
                  href="/intern/task"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-cyan-500/25 bg-cyan-500/5 hover:bg-cyan-500/15 hover:border-cyan-500/40 transition-all group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ListTodo className="h-4 w-4 text-cyan-400 shrink-0" />
                    <span className="text-xs font-medium text-foreground group-hover:text-cyan-300 transition-colors truncate">
                      {t("actionManageTasks")}
                    </span>
                  </div>
                  {tasksInProgress > 0 && (
                    <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/20 px-1.5 py-0.5 rounded-md shrink-0">
                      {tasksInProgress}
                    </span>
                  )}
                </Link>

                {/* Action 3: Weekly Evaluation */}
                <Link
                  href="/intern/weekly-evaluation"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/15 hover:border-emerald-500/40 transition-all group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Award className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-medium text-foreground group-hover:text-emerald-300 transition-colors truncate">
                      {t("actionWeeklyEvaluation")}
                    </span>
                  </div>
                  {avgScore > 0 && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded-md shrink-0">
                      {avgScore.toFixed(1)}
                    </span>
                  )}
                </Link>

                {/* Action 4: Meetings & Mentoring */}
                <Link
                  href="/intern/meetings"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-purple-500/25 bg-purple-500/5 hover:bg-purple-500/15 hover:border-purple-500/40 transition-all group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className="h-4 w-4 text-purple-400 shrink-0" />
                    <span className="text-xs font-medium text-foreground group-hover:text-purple-300 transition-colors truncate">
                      {t("actionMeetings")}
                    </span>
                  </div>
                </Link>
              </div>
            </div>
          </MetalCard>
        </div>
      </div>
    </div>
  );
}
