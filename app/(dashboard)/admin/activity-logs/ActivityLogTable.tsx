"use client";

import { useMemo, useState } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import ActorAvatar from "./ActorAvatar";
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  FileText,
  User,
  PlusCircle,
  Shield,
  Eye,
  Settings,
  Bell,
  Activity,
  FolderSearch,
  RotateCcw,
} from "lucide-react";

import { useActivityLogs } from "@/hooks/activity-log/useActivityLogs";
import type { ActivityLog, ActivityLogQuery } from "@/types/activity-log";
import ActivityLogDetailModal from "./ActivityLogDetailModal";

import Table from "@/components/ui/Table";
import MetalCard from "@/components/ui/MetalCard";
import Spinner from "@/components/ui/Spinner";

const COLUMNS = "145px minmax(150px, 1fr) 245px 185px minmax(180px, 1.4fr) 120px";

function getActionBadgeStyle(action: string) {
  if (action.startsWith("CREATE")) {
    return "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-400/30 border";
  }
  if (action.startsWith("UPDATE")) {
    return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-400/30 border";
  }
  if (action.startsWith("DELETE")) {
    return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-400/30 border";
  }
  if (action === "LOGIN") {
    return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-400/30 border";
  }
  if (action === "LOGOUT") {
    return "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-400/30 border";
  }
  return "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-400/30 border";
}

function getTargetTypeIcon(type: string | null) {
  const iconClass = "h-4 w-4 shrink-0";
  switch (type) {
    case "SUBMISSION":
      return <CheckCircle2 className={`${iconClass} text-emerald-600 dark:text-emerald-400`} />;
    case "DAILY_REPORT":
      return <Calendar className={`${iconClass} text-cyan-600 dark:text-cyan-400`} />;
    case "USER":
      return <User className={`${iconClass} text-indigo-600 dark:text-indigo-400`} />;
    case "INTERN":
      return <User className={`${iconClass} text-sky-600 dark:text-sky-400`} />;
    case "TASK":
      return <FileText className={`${iconClass} text-amber-600 dark:text-amber-400`} />;
    case "MEETING":
      return <Calendar className={`${iconClass} text-purple-600 dark:text-purple-400`} />;
    case "APPLICATION":
      return <PlusCircle className={`${iconClass} text-blue-600 dark:text-blue-400`} />;
    case "REGULATION":
      return <Shield className={`${iconClass} text-rose-600 dark:text-rose-400`} />;
    case "NOTIFICATION_SETTING":
      return <Bell className={`${iconClass} text-pink-600 dark:text-pink-400`} />;
    case "SYSTEM_SETTING":
      return <Settings className={`${iconClass} text-emerald-600 dark:text-emerald-400`} />;
    default:
      return <FileText className={`${iconClass} text-muted dark:text-slate-400`} />;
  }
}


export default function ActivityLogTable() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  const params: ActivityLogQuery = useMemo(() => {
    const p: ActivityLogQuery = {};

    const action = searchParams.get("action");
    const targetType = searchParams.get("targetType");
    const from = searchParams.get("from") ?? searchParams.get("createdFrom");
    const to = searchParams.get("to") ?? searchParams.get("createdTo");
    const order = searchParams.get("order");
    const page = searchParams.get("page");

    if (action) p.action = action;
    if (targetType) p.targetType = targetType;
    if (from) p.from = from;
    if (to) p.to = to;
    if (order) p.order = order as "asc" | "desc";
    p.page = page ? Number(page) : 1;
    p.limit = 20;

    return p;
  }, [searchParams]);

  const { data, isPending, isError, refetch, isFetching } =
    useActivityLogs(params);

  // Safely extract logs from data.data OR data.items
  const rawLogs = useMemo(() => {
    return data?.data ?? data?.items ?? [];
  }, [data]);

  // Client-side search filtering by keyword/actor/target/description
  const logs = useMemo(() => {
    const q = searchParams.get("search")?.toLowerCase().trim();
    if (!q) return rawLogs;
    return rawLogs.filter((log) => {
      const actorName = (log.actor?.fullName || log.user?.fullName || "").toLowerCase();
      const actorEmail = (log.actor?.email || log.user?.email || "").toLowerCase();
      const action = (log.action || "").toLowerCase();
      const target = (log.targetType || "").toLowerCase();
      const desc = (log.description || "").toLowerCase();
      return (
        actorName.includes(q) ||
        actorEmail.includes(q) ||
        action.includes(q) ||
        target.includes(q) ||
        desc.includes(q)
      );
    });
  }, [rawLogs, searchParams]);

  const meta = useMemo(() => {
    return (
      data?.meta ?? {
        total: data?.total ?? logs.length,
        page: data?.page ?? 1,
        limit: data?.limit ?? 20,
        totalPages: data?.totalPages ?? 1,
      }
    );
  }, [data, logs.length]);

  function goToPage(page: number) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("page", String(page));
    router.push(`${pathname}?${p.toString()}`);
  }

  function handleClearFilters() {
    const p = new URLSearchParams();
    p.set("page", "1");
    router.push(`${pathname}?${p.toString()}`);
  }

  if (isPending) {
    return (
      <MetalCard className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </MetalCard>
    );
  }

  if (isError) {
    return (
      <MetalCard className="flex flex-col items-center justify-center gap-3 py-16 px-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <p className="text-sm text-rose-300 font-medium">{t("admin.activityLogs.loadError")}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-white/10 hover:border-white/20 active:scale-95 cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>{t("admin.activityLogs.retry")}</span>
        </button>
      </MetalCard>
    );
  }

  const hasActiveFilters =
    Boolean(searchParams.get("search")) ||
    Boolean(searchParams.get("action")) ||
    Boolean(searchParams.get("targetType")) ||
    Boolean(searchParams.get("from")) ||
    Boolean(searchParams.get("to")) ||
    Boolean(searchParams.get("createdFrom")) ||
    Boolean(searchParams.get("createdTo"));

  if (logs.length === 0) {
    return (
      <MetalCard className="flex flex-col items-center justify-center gap-4 py-20 px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] text-muted">
          {hasActiveFilters ? (
            <FolderSearch className="h-7 w-7 text-cyan-400/70" />
          ) : (
            <Activity className="h-7 w-7 text-muted" />
          )}
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">
            {hasActiveFilters
              ? t("admin.activityLogs.noLogsFiltered")
              : t("admin.activityLogs.noLogs")}
          </p>
          <p className="mt-1 text-xs text-muted max-w-md">
            {hasActiveFilters
              ? "Hãy thử điều chỉnh hoặc xóa các tiêu chí bộ lọc để xem các bản ghi khác."
              : "Hệ thống chưa ghi nhận thao tác kiểm toán nào."}
          </p>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/20 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{t("admin.activityLogs.clearFilters")}</span>
          </button>
        )}
      </MetalCard>
    );
  }

  return (
    <>
      <Table
        columns={COLUMNS}
        className="
          bg-card dark:bg-[linear-gradient(145deg,#101827_0%,#1a2235_20%,#0f172a_55%,#050816_100%)]
          shadow-sm dark:shadow-[0_12px_40px_rgba(0,0,0,.45)]
          hover:shadow-md dark:hover:shadow-[0_20px_50px_rgba(21,174,245,.15)]
          transition-shadow duration-500
        "
      >
        <Table.Header>
          <div>{t("admin.activityLogs.time")}</div>
          <div>{t("admin.activityLogs.actor")}</div>
          <div>{t("admin.activityLogs.action")}</div>
          <div>{t("admin.activityLogs.target")}</div>
          <div>{t("admin.activityLogs.description_col")}</div>
          <div className="flex items-center justify-end gap-2 pr-1">
            <span>{t("admin.activityLogs.actions")}</span>
            <Table.ReloadButton onReload={refetch} isReloading={isFetching} />
          </div>
        </Table.Header>

        <Table.Body
          data={logs}
          render={(log) => {
            const actorName = log.actor?.fullName || log.user?.fullName || t("admin.activityLogs.system");
            const actorEmail = log.actor?.email || log.user?.email || "";
            const actorRole = log.actor?.role?.name || log.user?.role?.name || null;
            const actorAvatar = log.actor?.avatarUrl || log.user?.avatarUrl || null;
            const isSystem = (!log.actor && !log.user?.fullName) || actorName === t("admin.activityLogs.system") || (!log.actorId && !log.userId && !actorEmail);

            return (
              <Table.Row key={log.id}>
                {/* Time */}
                <div className="text-xs text-muted font-mono">
                  {new Date(log.createdAt).toLocaleString("vi-VN", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </div>

                {/* Actor */}
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <ActorAvatar
                    avatarUrl={actorAvatar}
                    name={actorName}
                    isSystem={isSystem}
                    fallbackTitle={t("admin.activityLogs.system")}
                    size="sm"
                  />
                  <div className="flex flex-col min-w-0 justify-center">
                    <span className="text-xs font-semibold text-foreground truncate" title={actorName}>
                      {actorName}
                    </span>
                    <span className="text-[10px] text-muted truncate" title={actorEmail || (actorRole ? `${t("admin.activityLogs.actorRole")}: ${actorRole}` : "—")}>
                      {actorEmail || (actorRole ? `${t("admin.activityLogs.actorRole")}: ${actorRole}` : "—")}
                    </span>
                  </div>
                </div>

                {/* Action */}
                <div className="flex items-center min-w-0 pr-2">
                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider whitespace-nowrap inline-block ${getActionBadgeStyle(
                      log.action,
                    )}`}
                    title={log.action}
                  >
                    {log.action}
                  </span>
                </div>

                {/* Target Type */}
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  {getTargetTypeIcon(log.targetType)}
                  <span className="text-xs font-medium text-foreground/90 dark:text-slate-300 truncate" title={log.targetType || "—"}>
                    {log.targetType || "—"}
                  </span>
                </div>

                {/* Changed Details / Description */}
                <div className="text-xs text-foreground/80 dark:text-slate-300 pr-2 break-words leading-relaxed font-medium line-clamp-2">
                  {log.description || "—"}
                </div>

                {/* Actions: View Detail */}
                <div className="flex items-center justify-end pr-1">
                  <button
                    type="button"
                    onClick={() => setSelectedLog(log)}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-2.5 py-1 text-xs font-medium text-muted hover:text-foreground hover:bg-card hover:border-border-strong dark:border-cyan-400/20 dark:bg-cyan-500/10 dark:text-cyan-300 dark:hover:border-cyan-400/40 dark:hover:bg-cyan-500/20 transition active:scale-95 cursor-pointer shadow-sm"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>{t("admin.activityLogs.viewDetail")}</span>
                  </button>
                </div>
              </Table.Row>
            );
          }}
        />

        {meta && meta.totalPages > 1 && (
          <Table.Footer>
            <div className="flex w-full items-center justify-between gap-4 text-sm">
              <p className="text-muted text-xs sm:text-sm">
                {t("admin.activityLogs.pagination", {
                  page: meta.page,
                  totalPages: meta.totalPages,
                  total: meta.total,
                })}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={meta.page <= 1}
                  onClick={() => goToPage(meta.page - 1)}
                  className="rounded-xl border border-border bg-slate-100 hover:bg-slate-200 text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-muted dark:hover:border-white/20 dark:hover:bg-white/[0.06] dark:hover:text-foreground px-3 py-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => goToPage(meta.page + 1)}
                  className="rounded-xl border border-border bg-slate-100 hover:bg-slate-200 text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-muted dark:hover:border-white/20 dark:hover:bg-white/[0.06] dark:hover:text-foreground px-3 py-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Table.Footer>
        )}
      </Table>

      {/* Detail Modal */}
      <ActivityLogDetailModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </>
  );
}
