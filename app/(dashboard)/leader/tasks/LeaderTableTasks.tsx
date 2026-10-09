"use client";

import { useState, useRef, useEffect, useMemo, useContext, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { Layers, MoreVertical, Eye, Pencil, Trash2, Loader2, ChevronLeft, ChevronRight, Check, ChevronDown, UserPlus, UserX, Sparkles, Building, RotateCcw, Clock, Calendar } from "lucide-react";
import { useTranslations } from "next-intl";
import DOMPurify from "isomorphic-dompurify";
import TaskAiRecommendationModal from "./TaskAiRecommendationModal";
import TaskGroupAiAllocationModal from "./TaskGroupAiAllocationModal";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import MetalCard from "@/components/ui/MetalCard";
import Spinner from "@/components/ui/Spinner";
import Table from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { useTaskGroups } from "@/hooks/task-group/useTaskGroups";
import { useTaskGroup } from "@/hooks/task-group/useTaskGroup";
import { useUpdateTaskGroup } from "@/hooks/task-group/useUpdateTaskGroup";
import { useDeleteTaskGroup } from "@/hooks/task-group/useDeleteTaskGroup";
import { useDepartments } from "@/hooks/department/useDepartments";
import { useTasks } from "@/hooks/task/useTasks";
import { useDeleteTask } from "@/hooks/task/useDeleteTask";
import { useInterns } from "@/hooks/intern/useInterns";
import { useAssignTask } from "@/hooks/task-assignment/useAssignTask";
import { useUnassignTask } from "@/hooks/task-assignment/useUnassignTask";
import { useUnblockTaskAssignment } from "@/hooks/task-assignment/useUnblockTaskAssignment";
import { useLookupAssignmentIntern } from "@/hooks/intern/useLookupAssignmentIntern";
import { AuthContext } from "@/contexts/AuthContext";
import { useRBAC } from "@/hooks/rbac/useRBAC";
import TaskEditModal from "./TaskEditModal";
import TaskGroupMemberSelector from "./TaskGroupMemberSelector";
import LeaderTaskViewModeToggle, { type LeaderViewMode } from "./LeaderTaskViewModeToggle";
import LeaderKanbanBoard from "./LeaderKanbanBoard";
import LeaderDependencyGraph from "./LeaderDependencyGraph";
import TaskViewModal from "./TaskViewModal";
import TaskScheduleAdjustModal from "./TaskScheduleAdjustModal";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import {
  extractTaskGroups,
  getTaskGroupMemberId,
  type TaskGroup,
  type UpdateTaskGroupPayload,
} from "@/types/task-group";
import { extractTasks, type Task, type TaskQueryParams } from "@/types/task";

type GroupAction = { type: "view" | "edit" | "delete"; groupId: string; groupName: string } | null;

const checkIsOverdue = (deadline?: string | null) => {
  if (!deadline) return false;
  const d = new Date(deadline);
  d.setHours(23, 59, 59, 999);
  return d < new Date();
};

export default function LeaderTableTasks() {
  const t = useTranslations("leader.tasks");
  const { can } = useRBAC();
  const [action, setAction] = useState<GroupAction>(null);
  const [taskAction, setTaskAction] = useState<{ type: "edit" | "delete"; taskId: string; taskTitle: string } | null>(null);
  const [aiTask, setAiTask] = useState<{ taskId: string; taskTitle: string; isAssigned: boolean } | null>(null);
  const [groupAiModal, setGroupAiModal] = useState<{ groupId: string; groupName: string } | null>(null);
  const [adjustScheduleGroup, setAdjustScheduleGroup] = useState<{ groupId: string; groupName: string } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const taskTriggerRef = useRef<HTMLButtonElement>(null);

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const taskGroupId = searchParams.get("taskGroupId") ?? null;
  const viewMode: LeaderViewMode = (searchParams.get("view") as LeaderViewMode) || "table";
  const [selectedViewTask, setSelectedViewTask] = useState<Task | null>(null);

  const handleViewModeChange = (mode: LeaderViewMode) => {
    const p = new URLSearchParams(searchParams.toString());
    if (mode === "table") {
      p.delete("view");
    } else {
      p.set("view", mode);
    }
    router.push(`${pathname}?${p.toString()}`, { scroll: false });
  };

  const openTaskAction = (a: { type: "edit" | "delete"; taskId: string; taskTitle: string }) => {
    setTaskAction(a);
    taskTriggerRef.current?.click();
  };

  const handleOpenReview = (aId: string) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set("reviewAssignmentId", aId);
    router.push(`${pathname}?${p.toString()}`, { scroll: false });
  };

  const handleOpenReviewExtension = useCallback(
    (aId: string) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("reviewExtensionAssignmentId", aId);
      router.push(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const unblockTask = useUnblockTaskAssignment();
  const handleUnblockTask = (aId: string) => {
    unblockTask.mutate(aId);
  };

  const { data: groupsData, isLoading: groupsLoading } = useTaskGroups();
  const groups = useMemo(() => extractTaskGroups(groupsData?.data), [groupsData]);

  const params: TaskQueryParams = useMemo(() => {
    const p: TaskQueryParams = {};

    const title = searchParams.get("title");
    const code = searchParams.get("code");
    const owner = searchParams.get("owner");
    const priority = searchParams.get("priority");
    const status = searchParams.get("status");
    const phase = searchParams.get("phase");
    const module_ = searchParams.get("module");
    const deadlineFrom = searchParams.get("deadlineFrom");
    const deadlineTo = searchParams.get("deadlineTo");
    const page = searchParams.get("page");
    const tab = searchParams.get("tab");
    const limit = searchParams.get("limit");
    const sortBy = searchParams.get("sortBy");
    const order = searchParams.get("order");

    if (title) p.title = title;
    if (code) p.code = code;
    if (owner) p.owner = owner;
    if (priority) p.priority = priority as TaskQueryParams["priority"];
    if (status) {
      p.status = status;
    } else if (tab === "extensions") {
      p.status = "EXTENSION_PENDING";
    }
    if (phase) p.phase = phase;
    if (module_) p.module = module_;
    if (deadlineFrom) p.deadlineFrom = deadlineFrom;
    if (deadlineTo) p.deadlineTo = deadlineTo;
    if (taskGroupId) p.taskGroupId = taskGroupId;
    if (page) p.page = Number(page);
    const defaultLimit = viewMode === "table" ? 10 : 100;
    p.limit = limit ? Number(limit) : defaultLimit;
    if (sortBy) p.sortBy = sortBy as TaskQueryParams["sortBy"];
    if (order) p.order = order as TaskQueryParams["order"];

    return p;
  }, [searchParams, taskGroupId, viewMode]);

  const { data: tasksData, isLoading: tasksLoading, refetch: tasksRefetch, isFetching: tasksFetching } = useTasks(params);
  const tasks = useMemo(() => extractTasks(tasksData?.data), [tasksData]);

  const requestId = searchParams.get("requestId");
  const hasAutoOpenedExtensionRef = useRef<string | null>(null);

  useEffect(() => {
    if (requestId && tasks.length > 0 && hasAutoOpenedExtensionRef.current !== requestId) {
      const matched = tasks.find((t) => {
        const assignment = t.assignment as { id?: string; extensionRequests?: Array<{ id: string }> } | undefined;
        return (
          assignment?.id &&
          (assignment.extensionRequests?.some((r) => r.id === requestId) || assignment.id === requestId)
        );
      });
      if (matched?.assignment?.id) {
        hasAutoOpenedExtensionRef.current = requestId;
        handleOpenReviewExtension(matched.assignment.id);
      }
    }
  }, [requestId, tasks, handleOpenReviewExtension]);

  const meta =
    tasksData?.meta ??
    (tasksData?.data && typeof tasksData.data === "object" && "meta" in tasksData.data
      ? (tasksData.data as { meta?: { total: number; page: number; limit: number; totalPages: number } }).meta
      : undefined);
  const openAction = (a: GroupAction) => { setAction(a); triggerRef.current?.click(); };

  function goToPage(page: number) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("page", String(page));
    router.push(`${pathname}?${p.toString()}`);
  }

  return (
    <>
    <Modal>
      <Modal.Open opens="group-action">
        <button ref={triggerRef} className="hidden" />
      </Modal.Open>

      <Modal.Open opens="task-action">
        <button ref={taskTriggerRef} className="hidden" />
      </Modal.Open>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Left: Task Groups */}
        <MetalCard className="min-h-[240px] min-w-0">
          <div className="min-w-0 p-4 pb-24">
            <div className="mb-3 flex items-center gap-2">
              <Layers className="h-4 w-4 shrink-0 text-cyan-400" />
              <h3 className="text-sm font-semibold metal-text">{t("taskGroups")}</h3>
            </div>
            {groupsLoading ? (
              <div className="flex justify-center py-8"><Spinner size="sm" /></div>
            ) : (
              <ul className="space-y-0.5">
                <li>
                  <button onClick={() => {
                    const p = new URLSearchParams(searchParams.toString());
                    p.delete("taskGroupId");
                    p.set("page", "1");
                    router.push(`${pathname}?${p.toString()}`);
                  }} className={`w-full rounded-xl px-3 py-2 text-left text-sm transition cursor-pointer ${taskGroupId === null ? "bg-primary-main/10 text-primary-light font-medium" : "text-muted hover:bg-white/5 hover:text-foreground"}`}>
                    {t("allTasks")}
                  </button>
                </li>
                {groups.map((g) => (
                  <TaskGroupItem
                    key={g.id}
                    group={g}
                    isSelected={taskGroupId === g.id}
                    onSelect={() => {
                      const p = new URLSearchParams(searchParams.toString());
                      p.set("taskGroupId", g.id);
                      p.set("page", "1");
                      router.push(`${pathname}?${p.toString()}`);
                    }}
                    onOpenAction={openAction}
                  />
                ))}
              </ul>
            )}
          </div>
        </MetalCard>

        {/* Right: Task Table / Kanban / Graph */}
        <div className="min-h-[240px] min-w-0 flex flex-col space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
            <div className="flex items-center">
              <h3 className="text-sm font-semibold">
                <span className="metal-text">{t("tasks")}</span>
                {taskGroupId && groups.find((g) => g.id === taskGroupId) && (
                  <span className="ml-2 font-normal text-muted">— {groups.find((g) => g.id === taskGroupId)!.name}</span>
                )}
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <LeaderTaskViewModeToggle mode={viewMode} onChange={handleViewModeChange} />

              {taskGroupId && can("TASK_ASSIGNMENT_CREATE") && (
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => {
                    const currentGroup = groups.find((g) => g.id === taskGroupId);
                    if (currentGroup) {
                      setGroupAiModal({ groupId: currentGroup.id, groupName: currentGroup.name });
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs text-sky-400 border border-sky-500/20 hover:bg-sky-500/10 transition-all font-semibold active:scale-95 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1 animate-pulse" />
                  <span>AI Phân công</span>
                </Button>
              )}

              {taskGroupId && can("TASK_UPDATE") && (
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => {
                    const currentGroup = groups.find((g) => g.id === taskGroupId);
                    if (currentGroup) {
                      setAdjustScheduleGroup({ groupId: currentGroup.id, groupName: currentGroup.name });
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/10 transition-all font-semibold active:scale-95 cursor-pointer"
                >
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  <span>{t("adjustSchedule")}</span>
                </Button>
              )}
            </div>
          </div>

          {tasksLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : viewMode === "kanban" ? (
            <LeaderKanbanBoard
              tasks={tasks}
              onSelectTask={(task) => setSelectedViewTask(task)}
              onOpenReview={handleOpenReview}
              onOpenReviewExtension={handleOpenReviewExtension}
              onUnblockTask={handleUnblockTask}
              isUnblocking={unblockTask.isPending}
              onOpenAiAssign={(tData) => setAiTask(tData)}
              onRefresh={tasksRefetch}
              isRefreshing={tasksFetching}
            />
          ) : viewMode === "graph" ? (
            <LeaderDependencyGraph
              tasks={tasks}
              onSelectTask={(task) => setSelectedViewTask(task)}
            />
          ) : tasks.length > 0 ? (
              <>
                {/* Mobile Card List (md:hidden) */}
                <div className="md:hidden space-y-3">
                  {tasks.map((task) => (
                    <TaskCardItem
                      key={task.id}
                      task={task}
                      pathname={pathname}
                      onOpenReview={handleOpenReview}
                      onOpenReviewExtension={handleOpenReviewExtension}
                      onUnblockTask={handleUnblockTask}
                      isUnblocking={unblockTask.isPending}
                      onOpenTaskAction={openTaskAction}
                      onOpenAiAssign={(tData) => setAiTask(tData)}
                    />
                  ))}

                  {meta && meta.totalPages > 1 && (
                    <div className="flex w-full items-center justify-between gap-4 border-t border-border/40 dark:border-white/5 pt-4 text-sm text-muted">
                      <p className="text-muted text-xs">
                        {t("pagination", { page: meta.page, totalPages: meta.totalPages, total: meta.total })}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={meta.page <= 1}
                          onClick={() => goToPage(meta.page - 1)}
                          className="rounded-xl border border-border bg-card px-3 py-1.5 text-muted transition-all hover:border-primary-light/40 hover:bg-slate-100 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.06]"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          disabled={meta.page >= meta.totalPages}
                          onClick={() => goToPage(meta.page + 1)}
                          className="rounded-xl border border-border bg-card px-3 py-1.5 text-muted transition-all hover:border-primary-light/40 hover:bg-slate-100 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.06]"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Desktop Table View (hidden md:block) */}
                <div className="hidden md:block">
                  <Table columns="65px minmax(200px,1.8fr) minmax(140px,1fr) minmax(120px,0.8fr) minmax(80px,0.35fr) minmax(115px,0.5fr) minmax(90px,0.4fr) 40px">
                    <Table.Header>
                      <div>{t("colCode")}</div>
                      <div>{t("colTitle")}</div>
                      <div>{t("colOwner")}</div>
                      <div>{t("colSupport")}</div>
                      <div>{t("colPriority")}</div>
                      <div>{t("colStatus")}</div>
                      <div>{t("colDeadline")}</div>
                      <div className="flex items-center justify-end">
                        <Table.ReloadButton onReload={tasksRefetch} isReloading={tasksFetching} />
                      </div>
                    </Table.Header>
                    <Table.Body
                      data={tasks}
                      render={(task) => (
                        <TaskTableRow
                          key={task.id}
                          task={task}
                          pathname={pathname}
                          onOpenReview={handleOpenReview}
                          onOpenReviewExtension={handleOpenReviewExtension}
                          onUnblockTask={handleUnblockTask}
                          isUnblocking={unblockTask.isPending}
                          onOpenTaskAction={openTaskAction}
                          onOpenAiAssign={(tData) => setAiTask(tData)}
                        />
                      )}
                    />
                    {meta && meta.totalPages > 1 && (
                      <Table.Footer>
                        <div className="flex w-full items-center justify-between gap-4 text-sm">
                          <p className="text-muted">
                            {t("pagination", { page: meta.page, totalPages: meta.totalPages, total: meta.total })}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={meta.page <= 1}
                              onClick={() => goToPage(meta.page - 1)}
                              className="rounded-xl border border-border bg-card px-3 py-2 text-muted transition-all hover:border-primary-light/40 hover:bg-slate-100 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.06]"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              disabled={meta.page >= meta.totalPages}
                              onClick={() => goToPage(meta.page + 1)}
                              className="rounded-xl border border-border bg-card px-3 py-2 text-muted transition-all hover:border-primary-light/40 hover:bg-slate-100 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.06]"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </Table.Footer>
                    )}
                  </Table>
                </div>
              </>
            ) : (
              <MetalCard className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <p className="text-sm text-muted">{t("noTasksFound")}</p>
              </MetalCard>
            )}
        </div>
      </div>

      <Modal.Window name="group-action" size="sm">
        {action?.type === "view" ? <ViewGroup groupId={action.groupId} onReviewClick={handleOpenReview} /> :
         action?.type === "edit" ? <EditGroup groupId={action.groupId} onClose={() => setAction(null)} /> :
         action?.type === "delete" ? <DeleteGroup groupId={action.groupId} groupName={action.groupName} onClose={() => { setAction(null); if (taskGroupId === action.groupId) router.push(pathname); }} /> :
         <div />}
      </Modal.Window>

      <Modal.Window name="task-action" size={taskAction?.type === "edit" ? "md" : "sm"}>
        {taskAction?.type === "edit" ? (
          <TaskEditModal taskId={taskAction.taskId} />
        ) : taskAction?.type === "delete" ? (
          <DeleteTaskConfirm taskId={taskAction.taskId} taskTitle={taskAction.taskTitle} onClose={() => setTaskAction(null)} />
        ) : (
          <div />
        )}
      </Modal.Window>
    </Modal>

    {/* AI Recommendation Modal */}
    {aiTask && (
      <TaskAiRecommendationModal
        taskId={aiTask.taskId}
        taskTitle={aiTask.taskTitle}
        isAssigned={aiTask.isAssigned}
        onClose={() => setAiTask(null)}
      />
    )}

    {/* Group AI Allocation Modal */}
    {groupAiModal && (
      <TaskGroupAiAllocationModal
        groupId={groupAiModal.groupId}
        groupName={groupAiModal.groupName}
        onClose={() => setGroupAiModal(null)}
      />
    )}

    {/* Task Schedule Adjustment Modal */}
    {adjustScheduleGroup && (
      <TaskScheduleAdjustModal
        initialTaskGroupId={adjustScheduleGroup.groupId}
        initialTaskGroupName={adjustScheduleGroup.groupName}
        onClose={() => setAdjustScheduleGroup(null)}
      />
    )}

    {/* Task View Modal */}
    {selectedViewTask && (
      <TaskViewModal
        task={selectedViewTask}
        onClose={() => setSelectedViewTask(null)}
      />
    )}
    </>
  );
}

/* ─── Task Group Item with Portal 3-Dots Menu ──────────────── */

function TaskGroupItem({
  group,
  isSelected,
  onSelect,
  onOpenAction,
}: {
  group: TaskGroup;
  isSelected: boolean;
  onSelect: () => void;
  onOpenAction: (a: GroupAction) => void;
}) {
  const t = useTranslations("leader.tasks");
  const { can } = useRBAC();
  const canView = can("TASK_GROUP_READ");
  const canEdit = can("TASK_GROUP_UPDATE");
  const canDelete = can("TASK_GROUP_DELETE");
  const hasAnyGroupAction = canView || canEdit || canDelete;

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) {
      setMenuOpen(false);
      return;
    }

    const MENU_WIDTH = 150;
    const ESTIMATED_HEIGHT = 130;
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;

    const openUpward = spaceBelow < ESTIMATED_HEIGHT && spaceAbove > spaceBelow;
    const maxHeight = openUpward
      ? Math.min(220, Math.max(100, spaceAbove - 16))
      : Math.min(220, Math.max(100, spaceBelow - 16));

    const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, vw - MENU_WIDTH - 8));

    setMenuStyle({
      position: "fixed",
      top: openUpward ? undefined : rect.bottom + 6,
      bottom: openUpward ? vh - rect.top + 6 : undefined,
      left,
      width: MENU_WIDTH,
      maxHeight,
      overflowY: "auto",
      zIndex: 9999,
    });
  }, []);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!menuOpen) {
      updateMenuPosition();
      setMenuOpen(true);
    } else {
      setMenuOpen(false);
    }
  };

  useEffect(() => {
    if (!menuOpen) return;
    updateMenuPosition();

    function handleOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    }

    window.addEventListener("scroll", updateMenuPosition, true);
    window.addEventListener("resize", updateMenuPosition);
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", updateMenuPosition, true);
      window.removeEventListener("resize", updateMenuPosition);
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen, updateMenuPosition]);

  return (
    <li className="group relative flex items-center">
      <button
        onClick={onSelect}
        className={`flex-1 min-w-0 rounded-xl px-3 py-2 text-left text-sm transition cursor-pointer ${
          isSelected
            ? "bg-primary-main/10 text-primary-light font-medium"
            : "text-muted hover:bg-white/5 hover:text-foreground"
        }`}
      >
        <span className="truncate block font-medium">{group.name}</span>
        {group.department?.name && (
          <span className="truncate flex items-center gap-1 text-[10px] text-sky-400 font-normal mt-0.5">
            <Building className="h-2.5 w-2.5 shrink-0" />
            {group.department.name}
          </span>
        )}
      </button>

      {hasAnyGroupAction && (
        <button
          ref={triggerRef}
          type="button"
          aria-label={`Actions for group ${group.name}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={`group-actions-${menuId}`}
          onClick={toggleMenu}
          className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted opacity-0 transition hover:bg-white/10 hover:text-foreground group-hover:opacity-100 cursor-pointer"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      )}

      {hasAnyGroupAction &&
        menuOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            id={`group-actions-${menuId}`}
            ref={menuRef}
            role="menu"
            style={menuStyle}
            className="rounded-2xl border border-border bg-card/95 p-1.5 shadow-xl backdrop-blur-2xl animate-fadeIn text-left scrollbar-dropdown dark:border-white/10 dark:bg-[#0c1322]/95 dark:shadow-[0_16px_48px_rgba(0,0,0,.6)]"
          >
            {canView && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenAction({ type: "view", groupId: group.id, groupName: group.name });
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs text-muted hover:bg-slate-100 hover:text-foreground active:scale-95 transition cursor-pointer dark:hover:bg-white/5"
              >
                <Eye className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                <span>{t("view")}</span>
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenAction({ type: "edit", groupId: group.id, groupName: group.name });
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs text-muted hover:bg-slate-100 hover:text-foreground active:scale-95 transition cursor-pointer dark:hover:bg-white/5"
              >
                <Pencil className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                <span>{t("edit")}</span>
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenAction({ type: "delete", groupId: group.id, groupName: group.name });
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 active:scale-95 transition cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                <span>{t("delete")}</span>
              </button>
            )}
          </div>,
          document.body,
        )}
    </li>
  );
}
/* ─── Task Row Desktop with Portal 3-Dots Menu ──────────────── */

function TaskTableRow({
  task,
  pathname,
  onOpenReview,
  onOpenReviewExtension,
  onUnblockTask,
  isUnblocking,
  onOpenTaskAction,
  onOpenAiAssign,
}: {
  task: Task;
  pathname: string;
  onOpenReview: (aId: string) => void;
  onOpenReviewExtension: (aId: string) => void;
  onUnblockTask: (aId: string) => void;
  isUnblocking: boolean;
  onOpenTaskAction: (a: { type: "edit" | "delete"; taskId: string; taskTitle: string }) => void;
  onOpenAiAssign: (a: { taskId: string; taskTitle: string; isAssigned: boolean }) => void;
}) {
  const t = useTranslations("leader.tasks");
  const { can } = useRBAC();
  const canAiAssign = can("TASK_ASSIGNMENT_CREATE");
  const canUnblock = can("TASK_ASSIGNMENT_UPDATE");
  const canReview = can("TASK_SUBMISSION_REVIEW") || can("TASK_ASSIGNMENT_UPDATE");
  const canView = can("TASK_READ");
  const canEdit = can("TASK_UPDATE");
  const canDelete = can("TASK_DELETE");

  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const isCompleted = task.assignment?.status === "DONE";
  const isBlocked = task.assignment?.status === "BLOCKED";

  const showAiAssign = canAiAssign && (!task.assignment || !task.assignment.internId) && !checkIsOverdue(task.deadline);
  const showUnblock = canUnblock && isBlocked && !!task.assignment?.id;
  const showReviewExtension = canReview && task.assignment?.status === "EXTENSION_PENDING" && !!task.assignment?.id;
  const hasAnyTaskAction = showAiAssign || showUnblock || showReviewExtension || canView || canEdit || canDelete;

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) {
      setMenuOpen(false);
      return;
    }

    const MENU_WIDTH = 180;
    const ESTIMATED_HEIGHT = 180;
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;

    const openUpward = spaceBelow < ESTIMATED_HEIGHT && spaceAbove > spaceBelow;
    const maxHeight = openUpward
      ? Math.min(260, Math.max(100, spaceAbove - 16))
      : Math.min(260, Math.max(100, spaceBelow - 16));

    const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, vw - MENU_WIDTH - 8));

    setMenuStyle({
      position: "fixed",
      top: openUpward ? undefined : rect.bottom + 6,
      bottom: openUpward ? vh - rect.top + 6 : undefined,
      left,
      width: MENU_WIDTH,
      maxHeight,
      overflowY: "auto",
      zIndex: 9999,
    });
  }, []);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!menuOpen) {
      updateMenuPosition();
      setMenuOpen(true);
    } else {
      setMenuOpen(false);
    }
  };

  useEffect(() => {
    if (!menuOpen) return;
    updateMenuPosition();

    function handleOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    }

    window.addEventListener("scroll", updateMenuPosition, true);
    window.addEventListener("resize", updateMenuPosition);
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", updateMenuPosition, true);
      window.removeEventListener("resize", updateMenuPosition);
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen, updateMenuPosition]);

  return (
    <Table.Row key={task.id}>
      <div className="font-mono text-xs text-muted">{task.code ?? "—"}</div>
      <div className="min-w-0 w-full overflow-hidden pr-2">
        <button
          type="button"
          onClick={() => router.push(`${pathname}/${task.id}`)}
          title={task.title}
          className="truncate block w-full max-w-full text-sm text-left hover:text-primary-light transition cursor-pointer font-medium"
        >
          {task.title}
        </button>
        {isCompleted && (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium mt-0.5 truncate max-w-full" title={t("completedTaskReadOnly")}>
            <Check className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{t("completedTaskReadOnly")}</span>
          </span>
        )}
      </div>
      <InlineAssignCell
        taskId={task.id}
        assignment={task.assignment}
        deadline={task.deadline}
        taskGroupDepartmentId={task.taskGroup?.departmentId}
      />
      <div className="truncate text-sm text-muted">
        {task.assignment?.support?.fullName ?? "—"}
      </div>
      <div>
        <PriorityBadge priority={task.priority} />
      </div>
      <div>
        <StatusBadge
          status={task.assignment?.status ?? "TODO"}
          assignmentId={task.assignment?.id}
          taskId={task.id}
          onReviewClick={onOpenReview}
          onReviewExtensionClick={onOpenReviewExtension}
          onUnblockClick={onUnblockTask}
          isUnblocking={isUnblocking}
        />
      </div>
      <div className="text-sm text-muted whitespace-nowrap">
        {task.deadline ? new Date(task.deadline).toLocaleDateString("vi-VN") : "—"}
      </div>
      <div className="relative text-right">
        {hasAnyTaskAction && (
          <button
            ref={triggerRef}
            type="button"
            aria-label={`Actions for task ${task.title}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={`task-actions-${menuId}`}
            onClick={toggleMenu}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card text-muted transition hover:border-primary-light/40 hover:bg-slate-100 hover:text-foreground active:scale-95 cursor-pointer dark:border-white/10 dark:bg-card/40 dark:hover:border-white/20 dark:hover:bg-card"
          >
            <MoreVertical className="h-4 w-4 shrink-0" />
          </button>
        )}

        {hasAnyTaskAction &&
          menuOpen &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              id={`task-actions-${menuId}`}
              ref={menuRef}
              role="menu"
              style={menuStyle}
              className="rounded-2xl border border-border bg-card/95 p-1.5 shadow-xl backdrop-blur-2xl animate-fadeIn text-left scrollbar-dropdown dark:border-white/10 dark:bg-[#0c1322]/95 dark:shadow-[0_16px_48px_rgba(0,0,0,.6)]"
            >
              {showAiAssign && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenAiAssign({ taskId: task.id, taskTitle: task.title, isAssigned: false });
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-sky-400 hover:bg-sky-500/10 active:scale-95 transition font-medium cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  <span>{t("aiAssign")}</span>
                </button>
              )}

              {showUnblock && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onUnblockTask(task.assignment!.id);
                  }}
                  disabled={isUnblocking}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-sky-400 hover:bg-sky-500/10 active:scale-95 transition font-medium disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                  <span>{t("unblockTask")}</span>
                </button>
              )}

              {showReviewExtension && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenReviewExtension(task.assignment!.id);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-amber-300 hover:bg-amber-500/10 active:scale-95 transition font-medium cursor-pointer"
                >
                  <Clock className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span>{t("reviewExtension")}</span>
                </button>
              )}

              {canView && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push(`${pathname}/${task.id}`);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted hover:bg-slate-100 hover:text-foreground active:scale-95 transition cursor-pointer dark:hover:bg-white/5"
                >
                  <Eye className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                  <span>{t("view")}</span>
                </button>
              )}

              {canEdit && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenTaskAction({ type: "edit", taskId: task.id, taskTitle: task.title });
                  }}
                  disabled={isCompleted}
                  title={isCompleted ? t("completedTaskReadOnly") : undefined}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted hover:bg-slate-100 hover:text-foreground active:scale-95 transition disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted cursor-pointer dark:hover:bg-white/5"
                >
                  <Pencil className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span>{t("edit")}</span>
                </button>
              )}

              {canDelete && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenTaskAction({ type: "delete", taskId: task.id, taskTitle: task.title });
                  }}
                  disabled={isCompleted}
                  title={isCompleted ? t("completedTaskReadOnly") : undefined}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 active:scale-95 transition disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-rose-400 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  <span>{t("delete")}</span>
                </button>
              )}
            </div>,
            document.body,
          )}
      </div>
    </Table.Row>
  );
}

/* ─── Task Card Mobile with Portal 3-Dots Menu ──────────────── */

function TaskCardItem({
  task,
  pathname,
  onOpenReview,
  onOpenReviewExtension,
  onUnblockTask,
  isUnblocking,
  onOpenTaskAction,
  onOpenAiAssign,
}: {
  task: Task;
  pathname: string;
  onOpenReview: (aId: string) => void;
  onOpenReviewExtension: (aId: string) => void;
  onUnblockTask: (aId: string) => void;
  isUnblocking: boolean;
  onOpenTaskAction: (a: { type: "edit" | "delete"; taskId: string; taskTitle: string }) => void;
  onOpenAiAssign: (a: { taskId: string; taskTitle: string; isAssigned: boolean }) => void;
}) {
  const t = useTranslations("leader.tasks");
  const { can } = useRBAC();
  const canAiAssign = can("TASK_ASSIGNMENT_CREATE");
  const canUnblock = can("TASK_ASSIGNMENT_UPDATE");
  const canReview = can("TASK_SUBMISSION_REVIEW") || can("TASK_ASSIGNMENT_UPDATE");
  const canView = can("TASK_READ");
  const canEdit = can("TASK_UPDATE");
  const canDelete = can("TASK_DELETE");

  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const isCompleted = task.assignment?.status === "DONE";
  const isBlocked = task.assignment?.status === "BLOCKED";

  const showAiAssign = canAiAssign && (!task.assignment || !task.assignment.internId) && !checkIsOverdue(task.deadline);
  const showUnblock = canUnblock && isBlocked && !!task.assignment?.id;
  const showReviewExtension = canReview && task.assignment?.status === "EXTENSION_PENDING" && !!task.assignment?.id;
  const hasAnyTaskAction = showAiAssign || showUnblock || showReviewExtension || canView || canEdit || canDelete;

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) {
      setMenuOpen(false);
      return;
    }

    const MENU_WIDTH = 180;
    const ESTIMATED_HEIGHT = 180;
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;

    const openUpward = spaceBelow < ESTIMATED_HEIGHT && spaceAbove > spaceBelow;
    const maxHeight = openUpward
      ? Math.min(260, Math.max(100, spaceAbove - 16))
      : Math.min(260, Math.max(100, spaceBelow - 16));

    const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, vw - MENU_WIDTH - 8));

    setMenuStyle({
      position: "fixed",
      top: openUpward ? undefined : rect.bottom + 6,
      bottom: openUpward ? vh - rect.top + 6 : undefined,
      left,
      width: MENU_WIDTH,
      maxHeight,
      overflowY: "auto",
      zIndex: 9999,
    });
  }, []);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!menuOpen) {
      updateMenuPosition();
      setMenuOpen(true);
    } else {
      setMenuOpen(false);
    }
  };

  useEffect(() => {
    if (!menuOpen) return;
    updateMenuPosition();

    function handleOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    }

    window.addEventListener("scroll", updateMenuPosition, true);
    window.addEventListener("resize", updateMenuPosition);
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", updateMenuPosition, true);
      window.removeEventListener("resize", updateMenuPosition);
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen, updateMenuPosition]);

  return (
    <div
      className={`rounded-2xl border p-4 space-y-3 transition-all ${
        isCompleted
          ? "border-emerald-500/30 bg-emerald-500/[0.03]"
          : isBlocked
          ? "border-rose-500/30 bg-rose-500/[0.03]"
          : "border-border bg-card/60"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted bg-white/5 px-2 py-0.5 rounded border border-white/5">
            {task.code ?? "—"}
          </span>
          <PriorityBadge priority={task.priority} />
          <StatusBadge
            status={task.assignment?.status ?? "TODO"}
            assignmentId={task.assignment?.id}
            taskId={task.id}
            onReviewClick={onOpenReview}
            onReviewExtensionClick={onOpenReviewExtension}
            onUnblockClick={onUnblockTask}
            isUnblocking={isUnblocking}
          />
        </div>

        <div className="relative">
          {hasAnyTaskAction && (
            <button
              ref={triggerRef}
              type="button"
              aria-label={`Actions for task ${task.title}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls={`task-card-actions-${menuId}`}
              onClick={toggleMenu}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card text-muted hover:bg-slate-100 hover:text-foreground active:scale-95 transition cursor-pointer dark:border-white/10 dark:bg-card/40 dark:hover:bg-white/10"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          )}

          {hasAnyTaskAction &&
            menuOpen &&
            typeof document !== "undefined" &&
            createPortal(
              <div
                id={`task-card-actions-${menuId}`}
                ref={menuRef}
                role="menu"
                style={menuStyle}
                className="rounded-2xl border border-border bg-card/95 p-1.5 shadow-xl backdrop-blur-2xl animate-fadeIn text-left scrollbar-dropdown dark:border-white/10 dark:bg-[#0c1322]/95 dark:shadow-[0_16px_48px_rgba(0,0,0,.6)]"
              >
                {showAiAssign && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenAiAssign({ taskId: task.id, taskTitle: task.title, isAssigned: false });
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-sky-400 hover:bg-sky-500/10 active:scale-95 transition font-medium cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    <span>{t("aiAssign")}</span>
                  </button>
                )}

                {showUnblock && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onUnblockTask(task.assignment!.id);
                    }}
                    disabled={isUnblocking}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-sky-400 hover:bg-sky-500/10 active:scale-95 transition font-medium disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                    <span>{t("unblockTask")}</span>
                  </button>
                )}

                {showReviewExtension && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenReviewExtension(task.assignment!.id);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-amber-300 hover:bg-amber-500/10 active:scale-95 transition font-medium cursor-pointer"
                  >
                    <Clock className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                    <span>{t("reviewExtension")}</span>
                  </button>
                )}

                {canView && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push(`${pathname}/${task.id}`);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted hover:bg-white/5 hover:text-foreground active:scale-95 transition cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                    <span>{t("view")}</span>
                  </button>
                )}

                {canEdit && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenTaskAction({ type: "edit", taskId: task.id, taskTitle: task.title });
                    }}
                    disabled={isCompleted}
                    title={isCompleted ? t("completedTaskReadOnly") : undefined}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted hover:bg-white/5 hover:text-foreground active:scale-95 transition disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                    <span>{t("edit")}</span>
                  </button>
                )}

                {canDelete && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenTaskAction({ type: "delete", taskId: task.id, taskTitle: task.title });
                    }}
                    disabled={isCompleted}
                    title={isCompleted ? t("completedTaskReadOnly") : undefined}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 active:scale-95 transition disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{t("delete")}</span>
                  </button>
                )}
              </div>,
              document.body,
            )}
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => router.push(`${pathname}/${task.id}`)}
          title={task.title}
          className="text-sm font-semibold text-foreground hover:text-primary-light transition text-left line-clamp-2 block cursor-pointer"
        >
          {task.title}
        </button>
      </div>

      {isCompleted && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300 font-medium">
          <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span>{t("completedTaskReadOnly")}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/40">
        <div>
          <span className="text-muted block text-[11px] mb-0.5">{t("colOwner")}</span>
          <InlineAssignCell
            taskId={task.id}
            assignment={task.assignment}
            deadline={task.deadline}
            taskGroupDepartmentId={task.taskGroup?.departmentId}
          />
        </div>
        <div>
          <span className="text-muted block text-[11px] mb-0.5">{t("colDeadline")}</span>
          <span className="text-foreground font-medium">
            {task.deadline ? new Date(task.deadline).toLocaleDateString("vi-VN") : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── View Group ────────────────────────────────────────────── */

function ViewGroup({
  groupId,
  onReviewClick,
}: {
  groupId: string;
  onReviewClick: (assignmentId: string, taskId: string) => void;
}) {
  const t = useTranslations("leader.tasks");
  const tv = useTranslations("leader.tasks.viewGroup");
  const { data, isLoading } = useTaskGroup(groupId);
  const { data: tasksData } = useTasks({ taskGroupId: groupId, limit: 5, sortBy: "createdAt", order: "desc" });
  const group = data?.data;
  const tasks = useMemo(() => extractTasks(tasksData?.data), [tasksData]);

  if (isLoading) return <div className="flex justify-center py-8"><Spinner size="sm" /></div>;
  if (!group) return <p className="py-4 text-center text-sm text-muted">{t("groupNotFound")}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-500/10">
          <Layers className="h-6 w-6 text-purple-400" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-foreground">{group.name}</h3>
          {group.description && <p className="mt-0.5 text-sm text-muted">{group.description}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-white/5 p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{group._count?.tasks ?? 0}</p>
          <p className="mt-0.5 text-xs text-muted">{tv("tasks")}</p>
        </div>
        <div className="rounded-xl border border-border bg-white/5 p-3 text-center">
          <p className="text-sm font-semibold text-foreground">{new Date(group.createdAt).toLocaleDateString("vi-VN")}</p>
          <p className="mt-0.5 text-xs text-muted">{tv("created")}</p>
        </div>
        <div className="rounded-xl border border-border bg-white/5 p-3 text-center">
          <p className="text-sm font-semibold text-foreground">{new Date(group.updatedAt).toLocaleDateString("vi-VN")}</p>
          <p className="mt-0.5 text-xs text-muted">{tv("updated")}</p>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-white/5 p-4">
        <DetailRow label={tv("id")} value={group.id} mono />
        <DetailRow label={tv("department")} value={group.department?.name ?? tv("allDepartments")} />
        <DetailRow label={tv("teamMembers")} value={String(group._count?.members ?? group.members?.length ?? 0)} />
        <DetailRow label={tv("maxWorkload")} value={tv("days", { n: group.maxWorkloadDays })} />
        <DetailRow label={tv("maxActiveTasks")} value={group.maxActiveTasks ? String(group.maxActiveTasks) : tv("unlimited")} />
        <DetailRow label={tv("requireAllMembers")} value={group.requireAllMembers ? tv("yes") : tv("no")} />
        <DetailRow label={tv("description")} value={group.description ?? "—"} />
        <DetailRow label={tv("created")} value={new Date(group.createdAt).toLocaleString("vi-VN")} />
        <DetailRow label={tv("updated")} value={new Date(group.updatedAt).toLocaleString("vi-VN")} />
      </div>

      {tasks.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{t("recentTasks")}</h4>
          <div className="space-y-1">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm">
                <span className="font-mono text-xs text-muted">{t.code ?? "—"}</span>
                <span className="flex-1 truncate text-foreground">{t.title}</span>
                <PriorityBadge priority={t.priority} />
                 <StatusBadge status={t.assignment?.status ?? "TODO"} assignmentId={t.assignment?.id} taskId={t.id} onReviewClick={onReviewClick} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Edit Group ────────────────────────────────────────────── */

function EditGroup({
  groupId,
  onClose,
  onCloseModal,
}: {
  groupId: string;
  onClose: () => void;
  onCloseModal?: () => void;
}) {
  const t = useTranslations("leader.tasks");
  const { data, isLoading } = useTaskGroup(groupId);
  const group = data?.data;

  if (isLoading) return <div className="flex justify-center py-8"><Spinner size="sm" /></div>;
  if (!group) return <p className="py-4 text-center text-sm text-muted">{t("groupNotFound")}</p>;

  return <EditGroupForm group={group} onClose={() => { onClose(); onCloseModal?.(); }} />;
}

function EditGroupForm({ group, onClose }: { group: TaskGroup; onClose: () => void }) {
  const te = useTranslations("leader.tasks.editGroup");
  const { data: deptData } = useDepartments();
  const departments = deptData?.data ?? [];
  const updateMutation = useUpdateTaskGroup();
  const [departmentId, setDepartmentId] = useState(group.departmentId ?? "");
  const [memberIds, setMemberIds] = useState(
    (group.members
      ?.map(getTaskGroupMemberId)
      .filter(Boolean) as string[]) ?? [],
  );
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdateTaskGroupPayload>({
    defaultValues: {
      name: group.name,
      description: group.description ?? "",
      departmentId: group.departmentId ?? "",
      maxWorkloadDays: group.maxWorkloadDays,
      maxActiveTasks: group.maxActiveTasks,
      requireAllMembers: group.requireAllMembers,
    },
  });

  return (
    <form
      onSubmit={handleSubmit((payload: UpdateTaskGroupPayload) =>
        updateMutation.mutate(
          {
            id: group.id,
            payload: {
              ...payload,
              departmentId: payload.departmentId || null,
              memberIds,
            },
          },
          { onSuccess: onClose },
        ),
      )}
      className="space-y-5"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10">
          <Pencil className="h-6 w-6 text-amber-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{te("title")}</h3>
          <p className="mt-0.5 text-sm text-muted">{te("description")}</p>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground">{te("name")}</label>
          <input
            type="text"
            {...register("name", { required: te("nameRequired") })}
            placeholder={te("namePlaceholder")}
            className="w-full h-[42px] sm:h-[46px] rounded-xl border border-border bg-card px-4 text-xs sm:text-sm text-foreground placeholder:text-muted focus:border-primary-light/40 focus:outline-none"
          />
          {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground">{te("department")}</label>
          <Select
            value={watch("departmentId") ?? ""}
            onChange={(val) => {
              setValue("departmentId", val);
              setDepartmentId(val);
              setMemberIds([]);
            }}
            options={[
              { value: "", label: te("allDepartments") },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
        </div>
        <TaskGroupMemberSelector
          departmentId={departmentId}
          selectedIds={memberIds}
          onChange={setMemberIds}
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground">{te("maxWorkload")}</label>
            <input
              type="number"
              min={0.5}
              step={0.5}
              {...register("maxWorkloadDays", { valueAsNumber: true })}
              className="w-full h-[42px] sm:h-[46px] rounded-xl border border-border bg-card px-4 text-xs sm:text-sm text-foreground focus:border-primary-light/40 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground">{te("maxActiveTasks")}</label>
            <input
              type="number"
              min={1}
              placeholder={te("unlimitedPlaceholder")}
              {...register("maxActiveTasks", {
                setValueAs: (value: unknown) =>
                  value === "" || value === null || value === undefined
                    ? null
                    : Number(value),
              })}
              className="w-full h-[42px] sm:h-[46px] rounded-xl border border-border bg-card px-4 text-xs sm:text-sm text-foreground placeholder:text-muted focus:border-primary-light/40 focus:outline-none"
            />
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-white/5 p-3">
          <input type="checkbox" {...register("requireAllMembers")} className="mt-0.5 h-4 w-4 accent-sky-500" />
          <span>
            <span className="block text-xs sm:text-sm font-medium text-foreground">{te("requireAllMembers")}</span>
            <span className="block text-xs text-muted">{te("requireAllMembersDesc")}</span>
          </span>
        </label>
        <div>
          <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground">{te("description")}</label>
          <textarea
            rows={3}
            {...register("description")}
            placeholder={te("descriptionPlaceholder")}
            className="w-full rounded-xl border border-border bg-card p-3 text-xs sm:text-sm text-foreground placeholder:text-muted focus:border-primary-light/40 focus:outline-none resize-none"
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="glass" size="md" onClick={onClose}>{te("cancel")}</Button>
        <Button type="submit" variant="primary" size="md" isLoading={updateMutation.isPending}>
          {!updateMutation.isPending && <Pencil className="h-4 w-4 mr-2" />}
          {te("saveChanges")}
        </Button>
      </div>
    </form>
  );
}

/* ─── Delete Group ──────────────────────────────────────────── */

function DeleteGroup({
  groupId,
  groupName,
  onClose,
  onCloseModal,
}: {
  groupId: string;
  groupName: string;
  onClose: () => void;
  onCloseModal?: () => void;
}) {
  const td = useTranslations("leader.tasks.deleteGroup");
  const deleteMutation = useDeleteTaskGroup();
  const handleDelete = () => {
    deleteMutation.mutate(groupId, {
      onSuccess: () => { onClose(); onCloseModal?.(); },
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-danger/20 bg-danger/5 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10">
            <Trash2 className="h-5 w-5 text-danger" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">{td("title")}</h3>
            <p className="text-sm leading-6 text-muted">
              {td.rich("confirm", {
                name: groupName,
                strong: (chunks) => (
                  <strong className="font-semibold text-foreground">{chunks}</strong>
                ),
              })}
            </p>
            <p className="text-sm text-muted">{td("warning")}</p>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 border-t pt-4">
        <Button variant="glass" onClick={onClose} disabled={deleteMutation.isPending}>{td("cancel")}</Button>
        <Button variant="danger" isLoading={deleteMutation.isPending} onClick={handleDelete}>{td("delete")}</Button>
      </div>
    </div>
  );
}

/* ─── Delete Task ─────────────────────────────────────────── */

function DeleteTaskConfirm({
  taskId,
  taskTitle,
  onClose,
  onCloseModal,
}: {
  taskId: string;
  taskTitle: string;
  onClose: () => void;
  onCloseModal?: () => void;
}) {
  const td = useTranslations("leader.tasks.deleteTask");
  const deleteTask = useDeleteTask();
  const handleDelete = () => {
    deleteTask.mutate(taskId, {
      onSuccess: () => { onClose(); onCloseModal?.(); },
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-danger/20 bg-danger/5 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10">
            <Trash2 className="h-5 w-5 text-danger" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">{td("title")}</h3>
            <p
              className="text-sm leading-6 text-muted"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(
                  td("confirm", {
                    title: taskTitle.replace(/[&<>"']/g, (m) => ({
                      "&": "&amp;",
                      "<": "&lt;",
                      ">": "&gt;",
                      '"': "&quot;",
                      "'": "&#39;",
                    }[m] || m)),
                  }),
                ),
              }}
            />
            <p className="text-sm text-muted">{td("warning")}</p>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 border-t border-border dark:border-white/10 pt-4">
        <Button variant="glass" onClick={onClose} disabled={deleteTask.isPending}>{td("cancel")}</Button>
        <Button variant="danger" isLoading={deleteTask.isPending} onClick={handleDelete}>{td("delete")}</Button>
      </div>
    </div>
  );
}

/* ─── Inline Assign Cell ──────────────────────────────────── */

function InlineAssignCell({
  taskId,
  assignment,
  deadline,
  taskGroupDepartmentId,
}: {
  taskId: string;
  assignment: { id: string; internId: string; status: string; intern?: { id: string; fullName: string } } | null;
  deadline?: string | null;
  taskGroupDepartmentId?: string | null;
}) {
  const t = useTranslations("leader.tasks");
  const { can } = useRBAC();
  const canAssign = can("TASK_ASSIGNMENT_CREATE");
  const canUnassign = can("TASK_ASSIGNMENT_DELETE");
  const canInternRead = can("INTERN_READ");
  const canModifyAssign = canAssign || canUnassign;

  const queryClient = useQueryClient();
  const auth = useContext(AuthContext);
  const currentUserId = auth?.state.user?.id;
  const [open, setOpen] = useState(false);
  const [otherInternEmail, setOtherInternEmail] = useState("");
  const [otherInternEmailError, setOtherInternEmailError] = useState("");
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const { data: myInternsData } = useInterns(
    { leaderId: currentUserId },
    { enabled: canInternRead && open }
  );
  const myInterns = myInternsData?.data ?? [];

  const assignTask = useAssignTask();
  const unassignTask = useUnassignTask();
  const lookupAssignmentIntern = useLookupAssignmentIntern();

  const isPending = assignTask.isPending || unassignTask.isPending || lookupAssignmentIntern.isPending;
  const currentInternId = assignment?.internId ?? null;

  const isOverdue = checkIsOverdue(deadline);
  const isCompleted = assignment?.status === "DONE";
  const canClick = !isCompleted && (!isOverdue || !!assignment);

  // Filter interns by taskGroup department if it belongs to a department
  const filteredMyInterns = taskGroupDepartmentId
    ? myInterns.filter((i) => i.department?.id === taskGroupDepartmentId)
    : myInterns;

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const POPOVER_WIDTH = 320;
    const ESTIMATED_HEIGHT = 300;
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < ESTIMATED_HEIGHT && spaceAbove > spaceBelow;
    const maxHeight = openUpward
      ? Math.min(360, Math.max(120, spaceAbove - 16))
      : Math.min(360, Math.max(120, spaceBelow - 16));

    let left = rect.left;
    if (left + POPOVER_WIDTH > vw - 16) {
      left = Math.max(16, vw - POPOVER_WIDTH - 16);
    }
    if (left < 16) left = 16;

    setPopoverStyle({
      position: "fixed",
      top: openUpward ? undefined : rect.bottom + 6,
      bottom: openUpward ? vh - rect.top + 6 : undefined,
      left,
      width: POPOVER_WIDTH,
      maxHeight,
      overflowY: "auto",
      zIndex: 9999,
    });
  }, []);

  const toggleOpen = () => {
    if (!open) {
      updatePosition();
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();

    function handleOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, updatePosition]);

  async function handleAssign(internId: string, internEmail?: string) {
    try {
      await assignTask.mutateAsync({
        taskId,
        payload: { internId, internEmail },
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stats"], exact: false });
    } catch {
      // error toast handled by mutation hooks
    }
    setOpen(false);
  }

  async function handleOtherInternLookup() {
    const normalizedEmail = otherInternEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setOtherInternEmailError(
        t.has("invalidInternEmail")
          ? t("invalidInternEmail")
          : "Enter a valid intern email.",
      );
      lookupAssignmentIntern.reset();
      return;
    }

    setOtherInternEmailError("");
    lookupAssignmentIntern.reset();
    try {
      await lookupAssignmentIntern.mutateAsync(normalizedEmail);
    } catch {
      setOtherInternEmailError(
        t.has("otherTeamInternNotFound")
          ? t("otherTeamInternNotFound")
          : "No active intern from another team matches this email.",
      );
    }
  }

  async function handleUnassign() {
    if (!assignment) return;
    try {
      await unassignTask.mutateAsync(taskId);
      queryClient.invalidateQueries({ queryKey: ["tasks"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stats"], exact: false });
    } catch {
      // error toast handled by mutation hooks
    }
    setOpen(false);
  }

  const assigneeName = assignment?.intern?.fullName;
  const assigneeEmail = myInterns.find((i) => i.id === assignment?.internId)?.user?.email;

  if (!canModifyAssign) {
    return (
      <div className="truncate text-left px-2 py-1">
        {assigneeName ? (
          <span className="block truncate text-sm font-medium text-foreground">{assigneeName}</span>
        ) : (
          <span className="text-sm text-muted">—</span>
        )}
      </div>
    );
  }

  return (
    <div className="relative min-w-0 w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        disabled={isPending || !canClick}
        title={isCompleted ? t("completedTaskReadOnly") : undefined}
        className={`flex w-full items-center gap-1 rounded-lg px-2 py-1 text-sm transition hover:bg-white/5 disabled:opacity-50 min-w-0 ${
          assigneeName ? "text-foreground" : "text-muted"
        } ${!canClick ? "cursor-not-allowed" : ""}`}
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin shrink-0" />
        ) : assigneeName ? (
          <div className="truncate text-left min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{assigneeName}</span>
            {assigneeEmail && (
              <span className="block truncate text-[11px] text-muted">{assigneeEmail}</span>
            )}
          </div>
        ) : (
          <span className="flex items-center gap-1">
            <UserPlus className="h-3 w-3" />
            {isOverdue ? t("expired") : t("assign")}
          </span>
        )}
        {!isPending && canClick && <ChevronDown className="h-3 w-3 shrink-0 text-muted" />}
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            style={popoverStyle}
            className="rounded-2xl border border-border bg-card/95 p-2 shadow-xl backdrop-blur-2xl animate-fadeIn text-left scrollbar-dropdown dark:border-white/10 dark:bg-[#0c1322]/95 dark:shadow-[0_16px_48px_rgba(0,0,0,.6)]"
          >
            {/* My Team & Other Teams (Only show if canAssign and not overdue) */}
            {canAssign && !isOverdue && (
              <>
                {filteredMyInterns.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                      {t("myTeam")}
                    </div>
                    {filteredMyInterns.map((intern) => (
                      <button
                        key={intern.id}
                        type="button"
                        onClick={() => handleAssign(intern.id)}
                        disabled={isPending}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-foreground hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer dark:hover:bg-white/5"
                      >
                        <span className="truncate flex-1 text-left">{intern.fullName}</span>
                        {currentInternId === intern.id && (
                          <Check className="h-3.5 w-3.5 shrink-0 text-primary-light" />
                        )}
                      </button>
                    ))}
                  </>
                )}

                <div className="mt-0.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  {t("otherTeams")}
                </div>
                <div className="space-y-2 px-2 pb-2">
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={otherInternEmail}
                      onChange={(event) => {
                        setOtherInternEmail(event.target.value);
                        setOtherInternEmailError("");
                        lookupAssignmentIntern.reset();
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handleOtherInternLookup();
                        }
                      }}
                      placeholder={
                        t.has("otherTeamEmailPlaceholder")
                          ? t("otherTeamEmailPlaceholder")
                          : "Exact intern email..."
                      }
                      disabled={isPending}
                      className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-primary-light/40 focus:outline-none disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => void handleOtherInternLookup()}
                      disabled={isPending}
                      className="rounded-lg border border-border bg-white/5 px-3 py-2 text-xs text-foreground hover:bg-white/10 disabled:opacity-50 cursor-pointer"
                    >
                      {lookupAssignmentIntern.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : t.has("checkEmail") ? (
                        t("checkEmail")
                      ) : (
                        "Check"
                      )}
                    </button>
                  </div>
                  {otherInternEmailError && <p className="text-xs text-red-400">{otherInternEmailError}</p>}
                  {lookupAssignmentIntern.data?.data && !otherInternEmailError && (
                    <button
                      type="button"
                      onClick={() => handleAssign(lookupAssignmentIntern.data.data.id, lookupAssignmentIntern.data.data.email)}
                      disabled={isPending}
                      className="flex w-full items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-left hover:bg-emerald-500/10 disabled:opacity-50 cursor-pointer"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-emerald-300">{lookupAssignmentIntern.data.data.fullName}</span>
                        <span className="block truncate text-[11px] text-slate-400">
                          {t.has("internLeader")
                            ? t("internLeader", {
                                name:
                                  lookupAssignmentIntern.data.data.leader.fullName ||
                                  lookupAssignmentIntern.data.data.leader.email,
                              })
                            : `Leader: ${lookupAssignmentIntern.data.data.leader.fullName || lookupAssignmentIntern.data.data.leader.email}`}
                        </span>
                      </span>
                      <UserPlus className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Unassign */}
            {canUnassign && assignment && (
              <>
                {canAssign && !isOverdue && <div className="my-0.5 border-t border-border" />}
                <button
                  type="button"
                  onClick={handleUnassign}
                  disabled={isPending}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 transition disabled:opacity-50 cursor-pointer"
                >
                  <UserX className="h-3.5 w-3.5" />
                  {t("unassign")}
                </button>
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

/* ─── Badges ────────────────────────────────────────────────── */

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    HIGH: "border border-red-300 bg-red-100/80 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400",
    MEDIUM: "border border-amber-300 bg-amber-100/80 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
    LOW: "border border-emerald-300 bg-emerald-100/80 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400",
  };
  return (
    <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-medium ${colors[priority] ?? "border border-border bg-card text-muted"}`}>
      {priority}
    </span>
  );
}

function StatusBadge({
  status,
  assignmentId,
  taskId,
  onReviewClick,
  onReviewExtensionClick,
  onUnblockClick,
  isUnblocking,
}: {
  status: string;
  assignmentId?: string;
  taskId?: string;
  onReviewClick?: (assignmentId: string, taskId: string) => void;
  onReviewExtensionClick?: (assignmentId: string) => void;
  onUnblockClick?: (assignmentId: string) => void;
  isUnblocking?: boolean;
}) {
  const t = useTranslations("leader.tasks");
  const { can } = useRBAC();
  const canUnblock = can("TASK_ASSIGNMENT_UPDATE");
  const canReview = can("TASK_SUBMISSION_REVIEW");

  const colors: Record<string, string> = {
    DONE: "border-emerald-300 bg-emerald-100/80 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    IN_PROGRESS: "border-sky-300 bg-sky-100/80 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
    REVIEW: "border-purple-300 bg-purple-100/80 text-purple-800 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300",
    TODO: "border-slate-300 bg-slate-100/90 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400",
    BLOCKED: "border-rose-300 bg-rose-100/80 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
    PENDING_APPROVAL: "border-amber-300 bg-amber-100/80 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    EXTENSION_PENDING: "border-amber-300 bg-amber-100/90 text-amber-800 font-bold animate-pulse shadow-xs dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-300 dark:shadow-[0_0_12px_rgba(245,158,11,0.2)]",
    UNASSIGNED: "border-orange-300 bg-orange-100/80 text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300",
  };

  const getStatusLabel = (s: string) => {
    switch (s) {
      case "TODO":
        return t("statusTodo");
      case "IN_PROGRESS":
        return t("statusInProgress");
      case "REVIEW":
        return t("statusReview");
      case "DONE":
        return t("statusDone");
      case "BLOCKED":
        return t("statusBlocked");
      case "PENDING_APPROVAL":
        return t("statusPendingApproval");
      case "EXTENSION_PENDING":
        return t("statusExtensionPending");
      case "UNASSIGNED":
        return t("statusUnassigned");
      default:
        return s.replace("_", " ");
    }
  };

  if (status === "DONE") {
    return (
      <span
        title={t("completedTaskReadOnly")}
        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-medium ${colors[status] ?? "border-border bg-card text-muted"}`}
      >
        <Check className="h-3 w-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
        {getStatusLabel(status)}
      </span>
    );
  }

  if (status === "BLOCKED" && assignmentId && onUnblockClick && canUnblock) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-medium ${colors[status] ?? "border-border bg-card text-muted"}`}
        >
          {getStatusLabel(status)}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUnblockClick(assignmentId);
          }}
          disabled={isUnblocking}
          title={t("unblockTask")}
          className="inline-flex items-center gap-1 rounded-md border border-sky-300 bg-sky-100/90 px-1.5 py-0.5 text-[11px] font-semibold text-sky-800 hover:bg-sky-200/90 hover:border-sky-400 transition disabled:opacity-50 cursor-pointer dark:border-sky-400/40 dark:bg-sky-500/15 dark:text-sky-300 dark:hover:bg-sky-500/25 dark:hover:border-sky-400/60"
        >
          {isUnblocking ? (
            <Loader2 className="h-2.5 w-2.5 animate-spin shrink-0" />
          ) : (
            <RotateCcw className="h-2.5 w-2.5 shrink-0" />
          )}
          {t("unblock")}
        </button>
      </div>
    );
  }

  if (status === "EXTENSION_PENDING" && assignmentId && onReviewExtensionClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onReviewExtensionClick(assignmentId);
        }}
        title={t("reviewExtension")}
        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-100/90 px-2 py-0.5 text-xs font-semibold text-amber-800 hover:bg-amber-200/90 transition cursor-pointer animate-pulse shadow-xs dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25 dark:shadow-[0_0_12px_rgba(245,158,11,0.2)]"
      >
        <Clock className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
        {t("statusExtensionPending")}
      </button>
    );
  }

  if (status === "REVIEW" && assignmentId && taskId && onReviewClick && canReview) {
    return (
      <button
        type="button"
        onClick={() => onReviewClick(assignmentId, taskId)}
        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs cursor-pointer transition hover:scale-105 hover:opacity-90 font-medium ${colors[status] ?? "border-border bg-card text-muted"}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-purple-500 dark:bg-purple-400 animate-pulse" />
        {getStatusLabel(status)}
      </button>
    );
  }

  return (
    <span
      className={`inline-flex rounded-lg border px-2 py-0.5 text-xs font-medium ${colors[status] ?? "border-border bg-card text-muted"}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="w-20 shrink-0 text-xs text-muted">{label}</span>
      <span className={`text-foreground ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
