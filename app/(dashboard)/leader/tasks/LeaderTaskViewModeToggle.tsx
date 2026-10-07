"use client";

import { TableProperties, LayoutGrid, Network } from "lucide-react";
import { useTranslations } from "next-intl";

export type LeaderViewMode = "table" | "kanban" | "graph";

interface LeaderTaskViewModeToggleProps {
  mode: LeaderViewMode;
  onChange: (mode: LeaderViewMode) => void;
}

export default function LeaderTaskViewModeToggle({
  mode,
  onChange,
}: LeaderTaskViewModeToggleProps) {
  const t = useTranslations("leader.tasks");

  return (
    <div
      role="tablist"
      aria-label="Task view mode selector"
      className="flex items-center rounded-2xl border border-border/80 bg-slate-100/90 p-1 backdrop-blur-md shadow-xs dark:border-white/10 dark:bg-slate-900/60 dark:shadow-none self-start sm:self-auto"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === "table"}
        onClick={() => onChange("table")}
        className={`flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
          mode === "table"
            ? "border border-sky-300 bg-sky-100/90 text-sky-800 shadow-xs dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-300 dark:shadow-[0_0_12px_rgba(14,165,233,0.25)]"
            : "text-muted hover:bg-slate-200/60 hover:text-foreground dark:hover:bg-white/5 dark:hover:text-foreground"
        }`}
      >
        <TableProperties className="h-4 w-4 shrink-0" />
        <span className="hidden xs:inline">{t("viewTable")}</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={mode === "kanban"}
        onClick={() => onChange("kanban")}
        className={`flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
          mode === "kanban"
            ? "border border-cyan-300 bg-cyan-100/90 text-cyan-800 shadow-xs dark:border-cyan-500/40 dark:bg-cyan-500/20 dark:text-cyan-300 dark:shadow-[0_0_12px_rgba(6,182,212,0.25)]"
            : "text-muted hover:bg-slate-200/60 hover:text-foreground dark:hover:bg-white/5 dark:hover:text-foreground"
        }`}
      >
        <LayoutGrid className="h-4 w-4 shrink-0" />
        <span className="hidden xs:inline">{t("viewKanban")}</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={mode === "graph"}
        onClick={() => onChange("graph")}
        className={`flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
          mode === "graph"
            ? "border border-indigo-300 bg-indigo-100/90 text-indigo-800 shadow-xs dark:border-indigo-500/40 dark:bg-indigo-500/20 dark:text-indigo-300 dark:shadow-[0_0_12px_rgba(99,102,241,0.25)]"
            : "text-muted hover:bg-slate-200/60 hover:text-foreground dark:hover:bg-white/5 dark:hover:text-foreground"
        }`}
      >
        <Network className="h-4 w-4 shrink-0" />
        <span className="hidden xs:inline">{t("viewGraph")}</span>
      </button>
    </div>
  );
}
