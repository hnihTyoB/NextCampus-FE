"use client";

import React, { useState, useMemo } from "react";
import {
  Building2,
  Send,
  Loader2,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  RefreshCw,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "react-hot-toast";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import type { Department } from "@/types/department";
import type {
  DiscordWebhookConfig,
  DiscordWebhookPurpose,
} from "@/types/discord";
import { useIsMutating } from "@tanstack/react-query";
import { useTestDiscordWebhook, useProvisionDepartment } from "@/hooks/discord";
import { useRBAC } from "@/hooks/rbac/useRBAC";

const COLUMNS =
  "minmax(220px, 1.6fr) minmax(240px, 2fr) minmax(240px, 2fr) minmax(210px, 1.8fr) minmax(200px, 1.4fr)";

interface DepartmentRoutingTableProps {
  departments: Department[];
  webhooks: DiscordWebhookConfig[];
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => void;
  onOpenCreateForDept: (deptId: string, purpose?: DiscordWebhookPurpose) => void;
  onOpenEdit: (webhook: DiscordWebhookConfig) => void;
  onOpenDelete: (webhook: DiscordWebhookConfig) => void;
}

export default function DepartmentRoutingTable({
  departments,
  webhooks,
  isLoading,
  isFetching,
  refetch,
  onOpenCreateForDept,
  onOpenEdit,
  onOpenDelete,
}: DepartmentRoutingTableProps) {
  const t = useTranslations("discord");
  const { can } = useRBAC();
  const canManage = can("DISCORD_MANAGE");
  const testMutation = useTestDiscordWebhook();
  const provisionMutation = useProvisionDepartment();
  const isProvisioningAll =
    useIsMutating({ mutationKey: ["discord", "provision-all"] }) > 0;
  const [searchTerm, setSearchTerm] = useState("");
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingDeptId, setSyncingDeptId] = useState<string | null>(null);

  // Filter departments by search query
  const filteredDepartments = useMemo(() => {
    if (!searchTerm.trim()) return departments;
    const term = searchTerm.toLowerCase().trim();
    return departments.filter((dept) =>
      dept.name.toLowerCase().includes(term)
    );
  }, [departments, searchTerm]);

  // Group webhooks by departmentId
  const webhooksByDept = useMemo(() => {
    const map = new Map<string, DiscordWebhookConfig[]>();
    for (const w of webhooks) {
      if (w.departmentId) {
        const list = map.get(w.departmentId) || [];
        list.push(w);
        map.set(w.departmentId, list);
      }
    }
    return map;
  }, [webhooks]);

  const handleTestPing = async (config: DiscordWebhookConfig) => {
    try {
      setTestingId(config.id);
      const res = await testMutation.mutateAsync({ id: config.id });
      if (res.success) {
        toast.success(
          t("toasts.testSuccess", { ms: res.data?.responseTimeMs ?? 120 })
        );
      } else {
        toast.error(
          t("toasts.testFailed", { message: res.message || "Error" })
        );
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error";
      toast.error(t("toasts.connectionError", { message: errorMsg }));
    } finally {
      setTestingId(null);
    }
  };

  const handleSyncDiscord = async (deptId: string) => {
    try {
      setSyncingDeptId(deptId);
      const res = await provisionMutation.mutateAsync(deptId);
      if (res.success) {
        toast.success(t("toasts.provisionSuccess"));
        refetch();
      } else {
        toast.error(
          t("toasts.provisionFailed", { message: res.message || "Error" })
        );
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error";
      toast.error(t("toasts.provisionFailed", { message: errorMsg }));
    } finally {
      setSyncingDeptId(null);
    }
  };

  // Render a cell for a specific channel purpose within a department
  const renderChannelCell = (
    dept: Department,
    purpose: DiscordWebhookPurpose,
    deptWebhooks: DiscordWebhookConfig[]
  ) => {
    const config = deptWebhooks.find((w) => w.purpose === purpose);
    const isTesting = testingId === config?.id;

    if (!config) {
      if (!canManage) {
        return (
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400/40" />
            <span className="italic text-[11px] text-muted">{t("statuses.unconfigured")}</span>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenCreateForDept(dept.id, purpose)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-border/80 bg-card/40 hover:bg-card hover:border-indigo-400/50 text-[11px] font-medium text-muted hover:text-indigo-600 dark:hover:text-indigo-300 transition active:scale-95 cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            <span>{t("globalSection.setupNow")}</span>
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1.5 min-w-0 pr-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {config.lastStatus === "SUCCESS" ? (
              <span className="flex h-2 w-2 shrink-0 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20 animate-pulse" />
            ) : config.lastStatus === "FAILED" ? (
              <span className="flex h-2 w-2 shrink-0 rounded-full bg-rose-400 ring-2 ring-rose-400/20" />
            ) : (
              <span className="flex h-2 w-2 shrink-0 rounded-full bg-amber-400" />
            )}
            <code className="text-[11px] font-mono text-foreground/80 truncate max-w-[120px] bg-black/10 dark:bg-white/5 px-1.5 py-0.5 rounded border border-border/30">
              {config.webhookUrl || config.maskedWebhookUrl || "••••••••••••"}
            </code>
          </div>

          {canManage && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                disabled={isTesting || !config.isEnabled}
                onClick={() => handleTestPing(config)}
                title={t("tooltips.testPing")}
                className="
                  p-1.5 rounded-lg border border-indigo-300 bg-indigo-100/80 text-indigo-700
                  hover:bg-indigo-200/80 dark:border-indigo-500/20 dark:bg-indigo-500/10
                  dark:text-indigo-400 dark:hover:bg-indigo-500/20
                  disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-95 cursor-pointer
                "
              >
                {isTesting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => onOpenEdit(config)}
                title={t("tooltips.edit")}
                className="p-1.5 rounded-lg border border-border bg-card/60 hover:bg-card text-muted hover:text-foreground hover:border-border-strong transition active:scale-95 cursor-pointer"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onOpenDelete(config)}
                title={t("tooltips.delete")}
                className="p-1.5 rounded-lg border border-rose-300 bg-rose-100/80 text-rose-700 hover:bg-rose-200/80 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 transition active:scale-95 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Role ID Tag */}
        {config.discordRoleId && (
          <div className="flex items-center gap-1 text-[10px] text-muted">
            <span>Tag:</span>
            <span className="font-mono text-indigo-400 bg-indigo-500/10 px-1 rounded border border-indigo-500/20 truncate max-w-[120px]">
              &lt;@&amp;{config.discordRoleId}&gt;
            </span>
          </div>
        )}

        {/* Private Thread ID Tag */}
        {config.threadId && (
          <div className="flex items-center gap-1 text-[10px] text-muted">
            <span className="text-cyan-500/90 font-medium">🔒 Thread:</span>
            <span className="font-mono text-cyan-400 bg-cyan-500/10 px-1 rounded border border-cyan-500/20 truncate max-w-[120px]">
              {config.threadId}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Table Title & Filter bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shrink-0">
              <Building2 className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-lg font-bold text-foreground metal-text">
              {t("departmentSection.title")}
            </h2>
            <Badge variant="primary" size="sm">
              {filteredDepartments.length} {t("departmentSection.departmentColumn")}
            </Badge>
          </div>
          <p className="text-xs text-muted mt-0.5">
            {t("departmentSection.subtitle")}
          </p>
        </div>

        {/* Search input with px-5 py-3 without internal magnifying glass icon (Rule 45 & 47) */}
        <div className="w-full sm:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("departmentSection.searchPlaceholder")}
            className="w-full h-[42px] sm:h-[46px] rounded-2xl border border-border bg-card px-5 text-sm text-foreground shadow-glass backdrop-blur-xl outline-none transition-all duration-300 hover:border-border-strong focus:border-indigo-400 focus:shadow-[0_0_28px_rgba(99,102,241,0.18)] placeholder:text-muted"
          />
        </div>
      </div>

      {/* Empty State */}
      {filteredDepartments.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-4 rounded-3xl border border-dashed border-border bg-card/40">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-400">
            <Building2 className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            {t("departmentSection.empty")}
          </p>
          <p className="text-xs text-muted max-w-md">
            {t("departmentSection.emptyHint")}
          </p>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-medium text-muted hover:text-foreground transition active:scale-95 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t("departmentSection.clearFilter")}</span>
            </button>
          )}
        </div>
      ) : (
        /* Notice: <Table> is NOT wrapped inside <MetalCard> per NexCampus rules */
        <Table
          columns={COLUMNS}
          className="
            bg-card dark:bg-[linear-gradient(145deg,#101827_0%,#1a2235_20%,#0f172a_55%,#050816_100%)]
            shadow-sm dark:shadow-[0_12px_40px_rgba(0,0,0,.45)]
            hover:shadow-md dark:hover:shadow-[0_20px_50px_rgba(99,102,241,.15)]
            transition-shadow duration-500
          "
        >
          <Table.Header>
            <div>{t("departmentSection.departmentColumn")}</div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span>{t("departmentSection.standupColumn")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-400" />
              <span>{t("departmentSection.taskBoardColumn")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <span>{t("departmentSection.meetingColumn")}</span>
            </div>
            <div className="flex justify-end pr-2">
              <Table.ReloadButton onReload={refetch} isReloading={isFetching} />
            </div>
          </Table.Header>

          <Table.Body
            data={filteredDepartments}
            isLoading={isLoading}
            render={(dept) => {
              const deptWebhooks = webhooksByDept.get(dept.id) || [];
              const totalActive = deptWebhooks.filter((w) => w.isEnabled).length;
              const isSyncing = syncingDeptId === dept.id;

              return (
                <Table.Row key={dept.id}>
                  {/* Department Info */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground font-bold text-xs">
                      <Building2 className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">
                        {dept.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted">
                          {t("departmentSection.positionsCount", {
                            count: dept.positionsCount ?? dept.positions?.length ?? 0,
                          })}
                        </span>
                        <span className="text-[10px] text-muted">•</span>
                        <span className="text-[10px] text-muted">
                          {t("departmentSection.channelsCount", {
                            count: totalActive,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Daily Standup Channel */}
                  <div>
                    {renderChannelCell(dept, "DAILY_STANDUP", deptWebhooks)}
                  </div>

                  {/* Task Board Channel */}
                  <div>
                    {renderChannelCell(dept, "TASK_BOARD", deptWebhooks)}
                  </div>

                  {/* Meeting Room Channel */}
                  <div>
                    {renderChannelCell(dept, "MEETING_ROOM", deptWebhooks)}
                  </div>

                  {/* Actions Column: Sync Discord + Add Webhook */}
                  <div className="flex items-center justify-end gap-2 pr-2">
                    {canManage && (
                      <>
                        <button
                          type="button"
                          disabled={isSyncing || isProvisioningAll}
                          onClick={() => handleSyncDiscord(dept.id)}
                          title={
                            isProvisioningAll
                              ? t("provisioning")
                              : t("departmentSection.syncDiscordTooltip")
                          }
                          className="
                            inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl
                            border border-cyan-300 bg-cyan-100/80 text-cyan-700 hover:bg-cyan-200/80
                            dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-400 dark:hover:bg-cyan-500/20
                            text-xs font-semibold shadow-xs
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-all active:scale-95 cursor-pointer
                          "
                        >
                          {isSyncing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                          )}
                          <span>
                            {isSyncing
                              ? t("departmentSection.syncingDiscord")
                              : t("departmentSection.syncDiscord")}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenCreateForDept(dept.id)}
                          title={t("modal.addTitle")}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-indigo-300 bg-indigo-100/80 text-indigo-700 hover:bg-indigo-200/80 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 text-xs font-medium transition active:scale-95 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>{t("departmentSection.actionsColumn")}</span>
                        </button>
                      </>
                    )}
                  </div>
                </Table.Row>
              );
            }}
          />
        </Table>
      )}
    </div>
  );
}
