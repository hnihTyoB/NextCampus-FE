"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Lock, Unlock, Calendar } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import type { Task } from "@/types/task";

interface LeaderDependencyGraphProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
}

interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

const statusBadgeStyles: Record<string, string> = {
  DONE: "border-emerald-300 bg-emerald-100/80 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  IN_PROGRESS: "border-blue-300 bg-blue-100/80 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
  REVIEW: "border-purple-300 bg-purple-100/80 text-purple-800 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300",
  TODO: "border-slate-300 bg-slate-100/80 text-slate-800 dark:border-slate-600/30 dark:bg-slate-700/20 dark:text-slate-300",
  BLOCKED: "border-rose-300 bg-rose-100/80 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
};

export default function LeaderDependencyGraph({
  tasks,
  onSelectTask,
}: LeaderDependencyGraphProps) {
  const t = useTranslations("leader.tasks");
  const locale = useLocale();

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [positions, setPositions] = useState<Record<string, NodePosition>>({});

  // 1. Group tasks into topological levels/phases
  const levels = useMemo(() => {
    const taskMap = new Map<string, Task>(tasks.map((t) => [t.id, t]));
    const levelMap = new Map<string, number>();

    const getLevel = (taskId: string, visited = new Set<string>()): number => {
      if (levelMap.has(taskId)) return levelMap.get(taskId)!;
      if (visited.has(taskId)) return 0; // cycle fallback
      visited.add(taskId);

      const task = taskMap.get(taskId);
      if (!task || !task.dependsOn || task.dependsOn.length === 0) {
        levelMap.set(taskId, 0);
        return 0;
      }

      let maxPrereqLevel = 0;
      for (const prereq of task.dependsOn) {
        const lvl = getLevel(prereq.id, new Set(visited));
        if (lvl + 1 > maxPrereqLevel) {
          maxPrereqLevel = lvl + 1;
        }
      }

      levelMap.set(taskId, maxPrereqLevel);
      return maxPrereqLevel;
    };

    tasks.forEach((task) => getLevel(task.id));

    // Group into columns array
    const maxLevel = Math.max(0, ...Array.from(levelMap.values()));
    const grouped: Task[][] = Array.from({ length: maxLevel + 1 }, () => []);

    tasks.forEach((task) => {
      const lvl = levelMap.get(task.id) ?? 0;
      grouped[lvl].push(task);
    });

    return grouped;
  }, [tasks]);

  // 2. Measure DOM positions for drawing SVG connector curves
  const updatePositions = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const newPositions: Record<string, NodePosition> = {};

    Object.entries(cardRefs.current).forEach(([id, el]) => {
      if (el) {
        const rect = el.getBoundingClientRect();
        newPositions[id] = {
          x: rect.left - containerRect.left + container.scrollLeft,
          y: rect.top - containerRect.top + container.scrollTop,
          width: rect.width,
          height: rect.height,
        };
      }
    });

    setPositions(newPositions);
  };

  useEffect(() => {
    updatePositions();
    const handleResize = () => updatePositions();
    window.addEventListener("resize", handleResize);
    const timer = setTimeout(updatePositions, 100);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [levels, tasks]);

  // 3. Compute SVG Edges (from prerequisite to dependent)
  const edges = useMemo(() => {
    const list: Array<{
      id: string;
      fromId: string;
      toId: string;
      isDone: boolean;
      d: string;
    }> = [];

    tasks.forEach((task) => {
      if (!task.dependsOn) return;
      const targetPos = positions[task.id];
      if (!targetPos) return;

      task.dependsOn.forEach((prereq) => {
        const sourcePos = positions[prereq.id];
        if (!sourcePos) return;

        const x1 = sourcePos.x + sourcePos.width;
        const y1 = sourcePos.y + sourcePos.height / 2;
        const x2 = targetPos.x;
        const y2 = targetPos.y + targetPos.height / 2;

        const dx = Math.max(40, (x2 - x1) / 2);
        const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

        // Prerequisite task status
        const prereqTask = tasks.find((t) => t.id === prereq.id);
        const isDone = prereqTask?.assignment?.status === "DONE";

        list.push({
          id: `${prereq.id}->${task.id}`,
          fromId: prereq.id,
          toId: task.id,
          isDone,
          d,
        });
      });
    });

    return list;
  }, [tasks, positions]);

  if (tasks.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 p-8 text-center bg-card/40">
        <p className="text-sm text-muted">{t("noTasksFound")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/80 bg-surface-elevated/80 px-4 py-2.5 text-xs shadow-xs dark:border-white/10 dark:bg-slate-900/60 dark:shadow-none">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-xs dark:shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            <span className="text-muted">{t("legendPrereqDone")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded-full border border-dashed border-amber-500 dark:border-amber-400 bg-amber-100 dark:bg-amber-400/20"></span>
            <span className="text-muted">{t("legendPrereqPending")}</span>
          </div>
        </div>

        <div className="text-[11px] text-muted">
          <span>{t("phasesCount", { count: levels.length })} · {tasks.length} {t("tasks").toLowerCase()}</span>
        </div>
      </div>

      {/* Graph Area */}
      <div
        ref={containerRef}
        className="relative overflow-x-auto overflow-y-hidden rounded-2xl border border-border/80 bg-slate-50/70 p-6 min-h-[550px] dark:border-border/60 dark:bg-slate-950/80 scrollbar-dropdown"
      >
        {/* SVG Bezier Connection Layer */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          <defs>
            <marker
              id="arrow-done"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
            </marker>
            <marker
              id="arrow-pending"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
            </marker>
          </defs>

          {edges.map((edge) => (
            <path
              key={edge.id}
              d={edge.d}
              fill="none"
              stroke={edge.isDone ? "#10b981" : "#f59e0b"}
              strokeWidth={edge.isDone ? "2.5" : "2"}
              strokeDasharray={edge.isDone ? "none" : "6,5"}
              markerEnd={edge.isDone ? "url(#arrow-done)" : "url(#arrow-pending)"}
              className={edge.isDone ? "drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "opacity-75"}
            />
          ))}
        </svg>

        {/* Levels / Columns */}
        <div className="flex items-start gap-16 min-w-max relative z-10">
          {levels.map((columnTasks, colIdx) => (
            <div key={colIdx} className="flex flex-col gap-5 w-72">
              {/* Column Header */}
              <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-mono font-bold text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30">
                  {colIdx + 1}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  {t("phase", { number: colIdx + 1 })}
                </span>
                <span className="text-[11px] text-muted ml-auto">({columnTasks.length})</span>
              </div>

              {/* Tasks in this level */}
              <div className="flex flex-col gap-4">
                {columnTasks.map((task) => {
                  const status = task.assignment?.status || "TODO";
                  const hasPrereqs = Boolean(task.dependsOn && task.dependsOn.length > 0);
                  const unfinishedPrereq = hasPrereqs
                    ? task.dependsOn?.find((p) => p.assignment?.status !== "DONE")
                    : null;
                  const isDone = status === "DONE";

                  return (
                    <div
                      key={task.id}
                      ref={(el) => {
                        cardRefs.current[task.id] = el;
                      }}
                      onClick={() => onSelectTask(task)}
                      className={`group relative rounded-xl border p-3.5 transition-all duration-200 cursor-pointer shadow-xs ${
                        isDone
                          ? "border-emerald-300 bg-emerald-50/40 hover:border-emerald-400 dark:border-emerald-500/30 dark:bg-emerald-950/20 dark:hover:border-emerald-400"
                          : unfinishedPrereq
                          ? "border-amber-300 bg-amber-50/40 hover:border-amber-400 dark:border-amber-500/30 dark:bg-amber-950/20 dark:hover:border-amber-400"
                          : "border-border/80 bg-card hover:border-border-strong hover:bg-card/90 dark:border-border/60 dark:bg-slate-900/60 dark:hover:bg-slate-900/90"
                      } active:scale-[0.99]`}
                    >
                      {/* Top: Code + Status Badge */}
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded border border-border bg-card/80 text-cyan-600 dark:text-cyan-400">
                          {task.code || "TASK"}
                        </span>
                        <span
                          className={`rounded border px-2 py-0.5 text-[10px] font-medium uppercase ${
                            statusBadgeStyles[status] || statusBadgeStyles.TODO
                          }`}
                        >
                          {status === "TODO"
                            ? t("statusTodo")
                            : status === "IN_PROGRESS"
                            ? t("statusInProgress")
                            : status === "REVIEW"
                            ? t("statusReview")
                            : status === "DONE"
                            ? t("statusDone")
                            : t("statusBlocked")}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-xs font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                        {task.title}
                      </h4>

                      {/* Dependency Lock indicator */}
                      {hasPrereqs && (
                        <div className="mb-2">
                          {unfinishedPrereq ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                              <Lock className="h-3 w-3 shrink-0" />
                              {t("dependencyWaiting", {
                                code: unfinishedPrereq.code || unfinishedPrereq.title,
                              })}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                              <Unlock className="h-3 w-3 shrink-0" />
                              {t("dependencyUnlocked")}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Footer: Assignee & Deadline */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted">
                        <span className="truncate max-w-[130px] font-medium text-foreground/80">
                          {task.assignment?.intern?.fullName || t("statusUnassigned")}
                        </span>

                        <div className="flex items-center gap-1 text-[10px] font-mono">
                          <Calendar className="h-3 w-3 text-muted" />
                          <span>
                            {task.deadline
                              ? new Date(task.deadline).toLocaleDateString(
                                  locale === "en" ? "en-US" : "vi-VN",
                                  {
                                    month: "numeric",
                                    day: "numeric",
                                  },
                                )
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
