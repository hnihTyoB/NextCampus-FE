"use client";

import React from "react";
import { Plus, RefreshCw, Loader2, Users } from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { useTranslations } from "next-intl";
import { toast } from "react-hot-toast";
import MetalCard from "@/components/ui/MetalCard";
import Badge from "@/components/ui/Badge";
import { useIsMutating } from "@tanstack/react-query";
import { useDiscordBotStatus, useProvisionAllDepartments } from "@/hooks/discord";
import { useRBAC } from "@/hooks/rbac/useRBAC";

interface DiscordHeaderProps {
  onOpenCreate: () => void;
  onOpenRoleSync: () => void;
}

export default function DiscordHeader({
  onOpenCreate,
  onOpenRoleSync,
}: DiscordHeaderProps) {
  const t = useTranslations("discord");
  const { can } = useRBAC();
  const canManage = can("DISCORD_MANAGE");
  const { data: botStatus, isLoading: isBotLoading } = useDiscordBotStatus();
  const provisionAllMutation = useProvisionAllDepartments();
  const isSyncingAnyDept =
    useIsMutating({ mutationKey: ["discord", "provision-department"] }) > 0;
  const isProvisioning = provisionAllMutation.isPending || isSyncingAnyDept;

  const handleProvisionAll = async () => {
    try {
      const result = await provisionAllMutation.mutateAsync();
      toast.success(
        t("provisionAllSuccess", {
          succeeded: result.data.succeeded,
          total: result.data.total,
        }),
      );
    } catch {
      toast.error(t("provisionAllFailed"));
    }
  };

  return (
    <MetalCard>
      <div className="rounded-3xl p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-300 bg-indigo-100/80 text-indigo-600 dark:border-indigo-400/30 dark:bg-indigo-500/15 dark:text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.25)]">
                <SiDiscord className="h-6 w-6 shrink-0" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold metal-text">
                    {t("title")}
                  </h1>

                  {/* Discord Bot Status Live Indicator */}
                  {isBotLoading ? (
                    <Badge variant="warning" size="sm" dot pulse>
                      {t("botStatus.checking")}
                    </Badge>
                  ) : botStatus?.isConnected ? (
                    <Badge
                      variant="success"
                      size="sm"
                      dot
                      pulse
                      title={
                        botStatus.guildName
                          ? t("botStatus.guild", { name: botStatus.guildName })
                          : undefined
                      }
                    >
                      {t("botStatus.connected")}
                      {botStatus.botName ? ` (${botStatus.botName})` : ""}
                    </Badge>
                  ) : (
                    <Badge variant="danger" size="sm" dot>
                      {t("botStatus.disconnected")}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted">
                  {t("subtitle")}
                </p>
              </div>
            </div>
          </div>

          {canManage && (
            <div className="flex items-center gap-3 shrink-0">
              {/* Sync All Departments Button */}
              <button
                type="button"
                onClick={handleProvisionAll}
                disabled={isProvisioning}
                title={t("provisionAll")}
                className="
                  group inline-flex items-center justify-center gap-2
                  rounded-xl sm:rounded-2xl
                  h-[42px] sm:h-[46px] px-4 sm:px-5
                  border border-emerald-500/30 bg-emerald-500/10 text-emerald-600
                  dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-400
                  text-sm font-semibold
                  hover:bg-emerald-500/20 hover:border-emerald-500/50
                  shadow-[0_0_12px_rgba(52,211,153,0.15)]
                  hover:shadow-[0_0_20px_rgba(52,211,153,0.3)]
                  transition-all duration-300
                  active:scale-[0.98]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400
                  disabled:pointer-events-none disabled:opacity-50
                  cursor-pointer select-none
                "
              >
                {provisionAllMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                ) : (
                  <RefreshCw className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:rotate-180" />
                )}
                <span className="hidden sm:inline">
                  {provisionAllMutation.isPending ? t("provisioning") : t("provisionAllShort")}
                </span>
              </button>

              {/* Batch Role Sync Button */}
              <button
                type="button"
                onClick={onOpenRoleSync}
                title={t("syncRolesButton")}
                className="
                  group inline-flex items-center justify-center gap-2
                  rounded-xl sm:rounded-2xl
                  h-[42px] sm:h-[46px] px-4 sm:px-5
                  border border-indigo-500/30 bg-indigo-500/10 text-indigo-600
                  dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-400
                  text-sm font-semibold
                  hover:bg-indigo-500/20 hover:border-indigo-500/50
                  shadow-[0_0_12px_rgba(99,102,241,0.15)]
                  hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]
                  transition-all duration-300
                  active:scale-[0.98]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                  cursor-pointer select-none
                "
              >
                <Users className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:scale-110" />
                <span className="hidden sm:inline">{t("syncRolesButtonShort")}</span>
              </button>

              <button
                type="button"
                onClick={onOpenCreate}
                className="
                  group relative inline-flex items-center justify-center gap-2 overflow-hidden
                  rounded-xl sm:rounded-2xl
                  h-[42px] sm:h-[46px] px-5 sm:px-6
                  bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500
                  text-sm font-semibold text-white
                  shadow-[0_0_25px_rgba(99,102,241,0.35)]
                  transition-all duration-300
                  hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_0_35px_rgba(99,102,241,0.5)] hover:brightness-110
                  active:scale-[0.98]
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background
                  disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed
                  cursor-pointer select-none
                "
              >
                <span
                  className="
                    pointer-events-none absolute inset-y-0 -left-24 w-16 rotate-12
                    bg-white/30 blur-lg
                    transition-all duration-700
                    group-hover:left-[130%]
                  "
                />
                <span className="relative flex items-center gap-2">
                  <Plus className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:rotate-90" />
                  <span>{t("addWebhook")}</span>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </MetalCard>
  );
}
