"use client";

import React, { useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Sliders,
  ShieldAlert,
  KeyRound,
  Webhook,
  ClockAlert,
} from "lucide-react";
import { useRBAC } from "@/hooks/rbac/useRBAC";
import AdminSettingsForm from "./AdminSettingsForm";
import MaintenanceTab from "./tabs/MaintenanceTab";
import ApiKeysTab from "./tabs/ApiKeysTab";
import WebhooksTab from "./tabs/WebhooksTab";
import CronJobsTab from "./tabs/CronJobsTab";

interface TabDefinition {
  id: "system" | "maintenance" | "apiKeys" | "webhooks" | "cronJobs";
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  canAccess: boolean;
  component: React.ReactNode;
}

export default function SettingsTabs() {
  const t = useTranslations("admin.settings.tabs");
  const { can, canAny } = useRBAC();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tabs: TabDefinition[] = useMemo(() => {
    const list: TabDefinition[] = [
      {
        id: "system",
        labelKey: "system",
        icon: Sliders,
        canAccess: can("SYSTEM_CONFIG_READ"),
        component: <AdminSettingsForm />,
      },
      {
        id: "maintenance",
        labelKey: "maintenance",
        icon: ShieldAlert,
        canAccess: canAny(["MAINTENANCE_READ", "MAINTENANCE_MANAGE"]),
        component: <MaintenanceTab />,
      },
      {
        id: "apiKeys",
        labelKey: "apiKeys",
        icon: KeyRound,
        canAccess: canAny(["API_KEY_READ", "API_KEY_MANAGE"]),
        component: <ApiKeysTab />,
      },
      {
        id: "webhooks",
        labelKey: "webhooks",
        icon: Webhook,
        canAccess: canAny(["WEBHOOK_READ", "WEBHOOK_MANAGE"]),
        component: <WebhooksTab />,
      },
      {
        id: "cronJobs",
        labelKey: "cronJobs",
        icon: ClockAlert,
        canAccess: canAny(["CRON_JOB_READ", "CRON_JOB_MANAGE"]),
        component: <CronJobsTab />,
      },
    ];

    // Strictly filter out tabs that the user cannot access
    return list.filter((tab) => tab.canAccess);
  }, [can, canAny]);

  const rawTabParam = searchParams.get("tab");
  const activeTabId = useMemo(() => {
    if (tabs.length === 0) return null;
    const matchingTab = tabs.find((t) => t.id === rawTabParam);
    return matchingTab ? matchingTab.id : tabs[0].id;
  }, [tabs, rawTabParam]);

  const handleSelectTab = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  if (tabs.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-muted">
        {t("accessDenied")}
      </div>
    );
  }

  const currentTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  return (
    <div className="space-y-6">
      {/* Tab Navigation Bar */}
      {tabs.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border/40 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-primary-main/20 border border-primary-light text-foreground shadow-[0_0_16px_rgba(99,102,241,0.25)]"
                    : "bg-card/40 border border-border/40 text-muted hover:bg-card-hover hover:text-foreground hover:border-border-strong"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? "text-primary-light" : "text-muted"
                  }`}
                />
                <span>{t(tab.labelKey)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Tab Content */}
      <div>{currentTab.component}</div>
    </div>
  );
}
