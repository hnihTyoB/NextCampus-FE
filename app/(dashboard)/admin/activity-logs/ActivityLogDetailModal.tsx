"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import ActorAvatar from "./ActorAvatar";
import {
  X,
  Copy,
  Check,
  User,
  Clock,
  Shield,
  Monitor,
  Terminal,
  FileCode,
} from "lucide-react";
import type { ActivityLog } from "@/types/activity-log";

interface ActivityLogDetailModalProps {
  log: ActivityLog | null;
  onClose: () => void;
}

export default function ActivityLogDetailModal({
  log,
  onClose,
}: ActivityLogDetailModalProps) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    if (log) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [log, onClose]);

  if (!log) return null;

  const jsonContent = log.details
    ? JSON.stringify(log.details, null, 2)
    : "{}";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const actorName = log.actor?.fullName || log.user?.fullName || t("admin.activityLogs.system");
  const actorEmail = log.actor?.email || log.user?.email || "—";
  const actorRole = log.actor?.role?.name || log.user?.role?.name || null;
  const actorAvatar = log.actor?.avatarUrl || log.user?.avatarUrl || null;
  const isSystem = (!log.actor && !log.user?.fullName) || actorName === t("admin.activityLogs.system") || (!log.actorId && !log.userId && actorEmail === "—");

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-border dark:border-white/10 bg-card text-foreground dark:bg-[#0c1322]/95 dark:text-slate-200 shadow-2xl backdrop-blur-2xl overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-border dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shadow-[0_0_16px_rgba(6,182,212,0.25)]">
              <Terminal className="h-5 w-5 shrink-0" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-foreground truncate">
                {t("admin.activityLogs.detailTitle")}
              </h3>
              <p className="text-xs text-muted truncate">
                {t("admin.activityLogs.detailDescription")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t("admin.activityLogs.close")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.03] dark:hover:bg-white/[0.08] text-muted hover:text-foreground transition active:scale-90 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 scrollbar-dropdown">
          {/* Action & ID Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-2xl border border-border dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">
                {t("admin.activityLogs.action")}:
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-cyan-100 dark:bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-400/30 shadow-xs">
                {log.action}
              </span>
            </div>

            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
              <span className="text-muted mr-1.5">{t("admin.activityLogs.logId")}:</span>
              <span className="select-all text-slate-700 dark:text-slate-300">{log.id}</span>
            </div>
          </div>

          {/* Grid Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Actor Card */}
            <div className="rounded-2xl border border-border dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                <User className="h-4 w-4 shrink-0" />
                <span>{t("admin.activityLogs.actorInfo")}</span>
              </div>
              <div className="flex items-center gap-3">
                <ActorAvatar
                  avatarUrl={actorAvatar}
                  name={actorName}
                  isSystem={isSystem}
                  fallbackTitle={t("admin.activityLogs.system")}
                  size="md"
                />
                <div className="min-w-0 space-y-0.5 text-xs">
                  <p className="font-bold text-foreground truncate">{actorName}</p>
                  <p className="text-muted truncate">{actorEmail}</p>
                  {actorRole && (
                    <span className="inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-md font-medium border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                      {actorRole}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Target Card */}
            <div className="rounded-2xl border border-border dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                <Shield className="h-4 w-4 shrink-0" />
                <span>{t("admin.activityLogs.targetInfo")}</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted">{t("admin.activityLogs.target")}:</span>
                  <span className="font-bold text-foreground">
                    {log.targetType || "—"}
                  </span>
                </div>
                {log.targetId && (
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                    <span className="text-muted">{t("admin.activityLogs.targetId")}:</span>{" "}
                    <span className="select-all text-slate-700 dark:text-slate-300">{log.targetId}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Timestamp */}
            <div className="rounded-2xl border border-border dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                <Clock className="h-4 w-4 shrink-0" />
                <span>{t("admin.activityLogs.timestamp")}</span>
              </div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {new Date(log.createdAt).toLocaleString("vi-VN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            </div>

            {/* Network / Client */}
            <div className="rounded-2xl border border-border dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02] p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                <Monitor className="h-4 w-4 shrink-0" />
                <span>{t("admin.activityLogs.ipAddress")} & Client</span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-mono text-slate-700 dark:text-slate-300">
                  IP: {log.ipAddress || "—"}
                </p>
                <p className="text-[11px] text-muted truncate" title={log.userAgent || ""}>
                  UA: {log.userAgent || "—"}
                </p>
              </div>
            </div>
          </div>

          {/* JSON Payload Viewer */}
          <div className="rounded-2xl border border-border dark:border-white/10 bg-slate-50/80 dark:bg-[#070b14] overflow-hidden shadow-xs">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border dark:border-white/10 bg-slate-100/90 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground dark:text-slate-200">
                <FileCode className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>{t("admin.activityLogs.payloadData")}</span>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg border border-border dark:border-white/10 bg-white hover:bg-slate-50 dark:bg-white/[0.04] dark:hover:bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-foreground dark:hover:text-white shadow-xs transition active:scale-95 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-700 dark:text-emerald-300">{t("admin.activityLogs.copiedJson")}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 text-muted" />
                    <span>{t("admin.activityLogs.copyJson")}</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 text-xs font-mono text-cyan-900 dark:text-cyan-300/90 bg-slate-50 dark:bg-transparent overflow-x-auto max-h-56 leading-relaxed select-all scrollbar-dropdown">
              {jsonContent}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 sm:px-6 border-t border-border dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 rounded-xl border border-border dark:border-white/10 bg-white hover:bg-slate-100 dark:bg-white/[0.04] dark:hover:border-white/20 dark:hover:bg-white/10 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-foreground dark:hover:text-white shadow-xs transition active:scale-95 cursor-pointer"
          >
            {t("admin.activityLogs.close")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
