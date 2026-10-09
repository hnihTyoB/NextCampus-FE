"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Calendar, Clock, ArrowRight, CheckCircle2, RotateCcw, AlertCircle, X, Lock } from "lucide-react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import Table from "@/components/ui/Table";
import { useTasks } from "@/hooks/task/useTasks";
import { useTaskGroups } from "@/hooks/task-group/useTaskGroups";
import { useAdjustTaskSchedule } from "@/hooks/task/useAdjustTaskSchedule";
import { extractTasks } from "@/types/task";
import { extractTaskGroups } from "@/types/task-group";

interface Props {
  initialTaskGroupId?: string;
  initialTaskGroupName?: string;
  onClose?: () => void;
  onCloseModal?: () => void;
  onSuccessApplied?: () => void;
}

function getLocalTodayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function calculateClientDeadlineStr(startDateStr: string, estDays?: number | null): string {
  if (!startDateStr || !startDateStr.includes("-")) return "—";
  const parts = startDateStr.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const est = estDays && estDays > 0 ? estDays : 1;
  const daysToAdd = Math.max(0, Math.ceil(est) - 1);
  d.setDate(d.getDate() + daysToAdd);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${day}/${m}/${y} 23:59`;
}

function formatDateDisplay(dateStr?: string | null, emptyText = "—"): string {
  if (!dateStr) return emptyText;
  const dateOnly = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  const parts = dateOnly.split("-").map(Number);
  if (parts.length !== 3) return dateStr;
  return `${String(parts[2]).padStart(2, "0")}/${String(parts[1]).padStart(2, "0")}/${parts[0]}`;
}

export default function TaskScheduleAdjustModal({
  initialTaskGroupId,
  initialTaskGroupName,
  onClose,
  onCloseModal,
  onSuccessApplied,
}: Props) {
  const ts = useTranslations("leader.tasks.scheduleModal");

  const [selectedGroupId, setSelectedGroupId] = useState(initialTaskGroupId || "");
  const [mode, setMode] = useState<"anchor" | "shift">("anchor");
  const [anchorStartDate, setAnchorStartDate] = useState(getLocalTodayStr());
  const [shiftDays, setShiftDays] = useState<number>(0);

  const { data: groupsData } = useTaskGroups();
  const groups = useMemo(() => extractTaskGroups(groupsData?.data), [groupsData]);

  const { data: tasksData, isLoading: tasksLoading } = useTasks({
    taskGroupId: selectedGroupId || undefined,
    limit: 100,
  });
  const tasks = useMemo(() => extractTasks(tasksData?.data), [tasksData]);

  const adjustMutation = useAdjustTaskSchedule();

  const handleClose = useCallback(() => {
    onClose?.();
    onCloseModal?.();
  }, [onClose, onCloseModal]);

  // Keyboard Escape listener & body scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [handleClose]);

  // Tính toán trước danh sách task sau khi điều chỉnh
  const previewTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];

    const todayStr = getLocalTodayStr();

    if (mode === "shift") {
      const shift = Number(shiftDays) || 0;
      return tasks.map((t) => {
        if (t.assignment?.status === "DONE") {
          return {
            ...t,
            newStartDateStr: t.startDate ? (t.startDate.includes("T") ? t.startDate.split("T")[0] : t.startDate) : null,
            newDeadlineStr: t.deadline ? formatDateDisplay(t.deadline) : "—",
            isLockedDone: true,
          };
        }

        let newStartDateStr: string;
        if (t.startDate) {
          const baseDateOnly = t.startDate.includes("T")
            ? t.startDate.split("T")[0]
            : t.startDate;
          const [y, m, d] = baseDateOnly.split("-").map(Number);
          const dt = new Date(y, m - 1, d);
          dt.setDate(dt.getDate() + shift);
          newStartDateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
        } else {
          const [y, m, d] = todayStr.split("-").map(Number);
          const dt = new Date(y, m - 1, d);
          dt.setDate(dt.getDate() + shift);
          newStartDateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
        }
        const newDeadlineStr = calculateClientDeadlineStr(newStartDateStr, t.estDays);
        return {
          ...t,
          newStartDateStr,
          newDeadlineStr,
          isLockedDone: false,
        };
      });
    }

    // Mode anchor:
    const activeTasksWithStart = tasks.filter((t) => !t.assignment || t.assignment.status !== "DONE").filter((t) => !!t.startDate);
    if (activeTasksWithStart.length > 0) {
      const earliestTime = Math.min(
        ...activeTasksWithStart.map((t) => {
          const dStr = t.startDate!.includes("T")
            ? t.startDate!.split("T")[0]
            : t.startDate!;
          const [y, m, d] = dStr.split("-").map(Number);
          return new Date(y, m - 1, d).getTime();
        }),
      );
      const [ay, am, ad] = anchorStartDate.split("-").map(Number);
      const anchorTime = new Date(ay, am - 1, ad).getTime();
      const deltaDays = Math.round((anchorTime - earliestTime) / (24 * 60 * 60 * 1000));

      return tasks.map((t) => {
        if (t.assignment?.status === "DONE") {
          return {
            ...t,
            newStartDateStr: t.startDate ? (t.startDate.includes("T") ? t.startDate.split("T")[0] : t.startDate) : null,
            newDeadlineStr: t.deadline ? formatDateDisplay(t.deadline) : "—",
            isLockedDone: true,
          };
        }

        let newStartDateStr: string;
        if (t.startDate) {
          const dStr = t.startDate.includes("T")
            ? t.startDate.split("T")[0]
            : t.startDate;
          const [y, m, d] = dStr.split("-").map(Number);
          const dt = new Date(y, m - 1, d);
          dt.setDate(dt.getDate() + deltaDays);
          newStartDateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
        } else {
          newStartDateStr = anchorStartDate;
        }
        const newDeadlineStr = calculateClientDeadlineStr(newStartDateStr, t.estDays);
        return {
          ...t,
          newStartDateStr,
          newDeadlineStr,
          isLockedDone: false,
        };
      });
    }

    // Tất cả chưa có startDate -> gán anchorStartDate
    return tasks.map((t) => {
      if (t.assignment?.status === "DONE") {
        return {
          ...t,
          newStartDateStr: t.startDate ? (t.startDate.includes("T") ? t.startDate.split("T")[0] : t.startDate) : null,
          newDeadlineStr: t.deadline ? formatDateDisplay(t.deadline) : "—",
          isLockedDone: true,
        };
      }

      const newStartDateStr = anchorStartDate;
      const newDeadlineStr = calculateClientDeadlineStr(newStartDateStr, t.estDays);
      return {
        ...t,
        newStartDateStr,
        newDeadlineStr,
        isLockedDone: false,
      };
    });
  }, [tasks, mode, anchorStartDate, shiftDays]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) return;

    adjustMutation.mutate(
      {
        taskGroupId: selectedGroupId,
        ...(mode === "anchor"
          ? { anchorStartDate }
          : { shiftDays: Number(shiftDays) || 0 }),
      },
      {
        onSuccess: () => {
          if (onSuccessApplied) {
            onSuccessApplied();
          } else {
            handleClose();
          }
        },
      },
    );
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="adjust-schedule-title"
      data-portal="schedule-adjust-modal"
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 p-2 sm:p-4 md:p-6 backdrop-blur-md animate-fadeIn overflow-hidden"
      onClick={handleBackdropClick}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl border border-border bg-card shadow-glass overflow-hidden dark:border-white/10 dark:bg-[#0c1222] animate-scaleUp"
      >
        {/* Glowing top accent */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

        {/* Close Button X */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 sm:right-5 sm:top-5 z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-slate-100 hover:bg-slate-200 text-muted hover:text-foreground transition-all cursor-pointer dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-border shrink-0 dark:border-slate-800">
          <div className="flex items-start gap-3.5 pr-10">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-100 border border-cyan-300 text-cyan-700 shadow-sm dark:bg-cyan-500/15 dark:border-cyan-500/30 dark:text-cyan-300">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
            </div>
            <div>
              <h2 id="adjust-schedule-title" className="text-base sm:text-xl font-bold metal-text">
                {ts("title")}
              </h2>
              <p className="text-xs sm:text-sm text-muted mt-0.5">
                {initialTaskGroupName
                  ? `${initialTaskGroupName} — ${ts("desc")}`
                  : ts("desc")}
              </p>
            </div>
          </div>
        </div>

        {/* Form Body + Footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
            {/* Nhóm công việc */}
            <div>
              <label className="mb-1.5 flex items-center gap-1 text-xs sm:text-sm font-medium text-foreground/90 select-none">
                {ts("groupLabel")} <span className="text-red-400">*</span>
              </label>
              <Select
                value={selectedGroupId}
                onChange={(val) => setSelectedGroupId(val)}
                placeholder={ts("groupPlaceholder")}
                options={groups.map((g) => ({
                  value: g.id,
                  label: g.name,
                }))}
              />
            </div>

            {/* Chế độ điều chỉnh */}
            <div className="space-y-2">
              <label className="flex items-center gap-1 text-xs sm:text-sm font-medium text-foreground/90 select-none">
                {ts("methodLabel")}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode("anchor")}
                  className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    mode === "anchor"
                      ? "border-cyan-400/80 bg-cyan-500/10 text-foreground ring-1 ring-cyan-400/50"
                      : "border-border bg-card/60 text-muted hover:border-border/80 hover:bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <span className={`h-2.5 w-2.5 rounded-full ${mode === "anchor" ? "bg-cyan-400" : "bg-muted"}`} />
                    <span>{ts("anchorMethodTitle")}</span>
                  </div>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    {ts("anchorMethodDesc")}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("shift")}
                  className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    mode === "shift"
                      ? "border-cyan-400/80 bg-cyan-500/10 text-foreground ring-1 ring-cyan-400/50"
                      : "border-border bg-card/60 text-muted hover:border-border/80 hover:bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <span className={`h-2.5 w-2.5 rounded-full ${mode === "shift" ? "bg-cyan-400" : "bg-muted"}`} />
                    <span>{ts("shiftMethodTitle")}</span>
                  </div>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    {ts("shiftMethodDesc")}
                  </p>
                </button>
              </div>
            </div>

            {/* Inputs tuỳ theo Mode */}
            {mode === "anchor" ? (
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-2">
                <label className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-cyan-300">
                  <Calendar className="h-4 w-4" />
                  {ts("newAnchorDateLabel")}
                </label>
                <DatePicker
                  value={anchorStartDate}
                  onChange={(val) => setAnchorStartDate(val)}
                  placeholder="YYYY-MM-DD"
                />
                <p className="text-[11px] text-muted">
                  {ts("newAnchorDateHint")}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-2">
                <label className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-cyan-300">
                  <RotateCcw className="h-4 w-4" />
                  {ts("shiftDaysLabel")}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={shiftDays}
                    onChange={(e) => setShiftDays(Number(e.target.value))}
                    step={1}
                    className="w-full rounded-xl border border-border bg-card px-3.5 py-2 text-sm text-foreground focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    placeholder={ts("shiftDaysPlaceholder")}
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShiftDays((prev) => prev - 1)}
                      className="px-2.5 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-card/80 cursor-pointer"
                    >
                      -1d
                    </button>
                    <button
                      type="button"
                      onClick={() => setShiftDays((prev) => prev + 1)}
                      className="px-2.5 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-card/80 cursor-pointer"
                    >
                      +1d
                    </button>
                    <button
                      type="button"
                      onClick={() => setShiftDays(0)}
                      className="px-2.5 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-card/80 cursor-pointer"
                    >
                      0
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Live Preview Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-foreground/90">
                  <Clock className="h-4 w-4 text-cyan-400" />
                  {ts("previewHeading", { count: previewTasks.length })}
                </h4>
                <span className="text-[11px] text-muted">
                  {ts("previewFormula")}
                </span>
              </div>

              {tasksLoading ? (
                <div className="rounded-2xl border border-border p-8 text-center text-xs text-muted">
                  {ts("loadingTasks")}
                </div>
              ) : previewTasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted flex flex-col items-center gap-2">
                  <AlertCircle className="h-6 w-6 text-muted" />
                  <span>{ts("noTasksFound")}</span>
                </div>
              ) : (
                <div className="rounded-2xl border border-border overflow-hidden">
                  <Table columns="80px 1.4fr 80px 1.6fr 1.2fr">
                    <Table.Header>
                      <div>{ts("colCode")}</div>
                      <div>{ts("colTitle")}</div>
                      <div>{ts("colEstDays")}</div>
                      <div>{ts("colStartChange")}</div>
                      <div>{ts("colNewDeadline")}</div>
                    </Table.Header>
                    <Table.Body
                      data={previewTasks}
                      render={(task) => (
                        <Table.Row key={task.id}>
                          <div className="font-mono text-xs text-muted">{task.code ?? "—"}</div>
                          <div className="truncate text-xs font-medium text-foreground">
                            {task.title}
                          </div>
                          <div className="text-xs text-muted">
                            {task.estDays ? `${task.estDays}d` : "1d"}
                          </div>
                          <div className="text-xs flex items-center gap-1.5">
                            {task.isLockedDone ? (
                              <span className="flex items-center gap-1 text-slate-400 italic">
                                <Lock className="h-3 w-3 text-amber-400 shrink-0" />
                                <span>{formatDateDisplay(task.startDate, ts("notSet"))}</span>
                              </span>
                            ) : (
                              <>
                                <span className="text-muted line-through">
                                  {formatDateDisplay(task.startDate, ts("notSet"))}
                                </span>
                                <ArrowRight className="h-3 w-3 text-cyan-400 shrink-0" />
                                <span className="font-semibold text-emerald-400">
                                  {formatDateDisplay(task.newStartDateStr, ts("notSet"))}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="text-xs font-medium text-cyan-300">
                            {task.isLockedDone ? (
                              <span className="text-slate-400 italic">
                                {task.newDeadlineStr}
                              </span>
                            ) : (
                              task.newDeadlineStr
                            )}
                          </div>
                        </Table.Row>
                      )}
                    />
                  </Table>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Footer Actions */}
          <div className="flex items-center justify-end gap-3 p-4 sm:px-6 border-t border-border bg-card/90 shrink-0 dark:border-slate-800 backdrop-blur-sm">
            <Button
              type="button"
              variant="glass"
              size="md"
              onClick={handleClose}
            >
              {ts("cancelBtn")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={adjustMutation.isPending}
              disabled={
                !selectedGroupId ||
                previewTasks.length === 0 ||
                previewTasks.every((t) => t.isLockedDone)
              }
            >
              {!adjustMutation.isPending && <CheckCircle2 className="h-4 w-4 mr-2" />}
              {ts("applyBtn", {
                count: previewTasks.filter((t) => !t.isLockedDone).length,
              })}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
