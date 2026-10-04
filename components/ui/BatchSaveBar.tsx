"use client";

import { useTranslations } from "next-intl";
import { Check, RotateCcw, Loader2, Sparkles } from "lucide-react";

export interface BatchSaveBarProps {
  count?: number;
  dirtyCount?: number;
  isSaving?: boolean;
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
  title?: string;
  saveLabel?: string;
  discardLabel?: string;
}

export default function BatchSaveBar({
  count,
  dirtyCount,
  isSaving = false,
  onSave,
  onDiscard,
  title,
  saveLabel,
  discardLabel,
}: BatchSaveBarProps) {
  const t = useTranslations("batchSave");
  const totalCount = count ?? dirtyCount ?? 0;

  if (totalCount <= 0) return null;

  return (
    <div
      role="region"
      aria-label="Pending changes toolbar"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-4 sm:gap-6 rounded-2xl border border-cyan-500/40 bg-card/95 px-4 py-3 sm:px-6 sm:py-3.5 shadow-2xl backdrop-blur-2xl dark:border-cyan-400/30 dark:bg-[#0c1322]/95 dark:shadow-[0_0_40px_rgba(6,182,212,0.3)] animate-fadeIn max-w-[calc(100vw-32px)]"
    >
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400 animate-pulse">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
            {title ?? t("pendingChanges", { count: totalCount })}
          </p>
          <p className="text-[11px] text-muted hidden sm:block">
            {t("helperText")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onDiscard}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/60 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-medium text-muted hover:bg-slate-100 hover:text-foreground dark:hover:bg-white/5 active:scale-95 transition disabled:opacity-50 cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>{discardLabel ?? t("discard")}</span>
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/25 active:scale-95 transition disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          <span>{isSaving ? t("saving") : (saveLabel ?? t("saveChanges"))}</span>
        </button>
      </div>
    </div>
  );
}
