"use client";

import { useTranslations } from "next-intl";
import {
  Users,
  Building2,
  PieChart,
  Edit3,
  Trash2,
  ListTodo,
  Loader2,
} from "lucide-react";
import type { TaskGroup } from "@/types/task-group";
import { getTaskGroupMemberId, getTaskGroupMemberName } from "@/types/task-group";
import Modal from "@/components/ui/Modal";
import MetalCard from "@/components/ui/MetalCard";
import TaskGroupQuotaAllocationModal from "@/components/task-group/TaskGroupQuotaAllocationModal";
import TaskGroupEditModal from "@/components/task-group/TaskGroupEditModal";
import { useTaskGroupProgress } from "@/hooks/task-group/useTaskGroupProgress";
import { useDeleteTaskGroup } from "@/hooks/task-group/useDeleteTaskGroup";
import { useRBAC } from "@/hooks/rbac/useRBAC";

interface TaskGroupCardProps {
  group: TaskGroup;
}

export default function TaskGroupCard({ group }: TaskGroupCardProps) {
  const t = useTranslations();
  const { can } = useRBAC();
  const canUpdate = can("TASK_GROUP_UPDATE");
  const canDelete = can("TASK_GROUP_DELETE");
  const hasActions = canUpdate || canDelete;

  const { mutate: deleteGroup, isPending: deleting } = useDeleteTaskGroup();
  const { data: progressData } = useTaskGroupProgress(group.id);

  const progress = progressData?.data;
  const completionRate = progress?.completionRate ?? 0;
  const totalTasks = progress?.totalTasks ?? group._count?.tasks ?? 0;
  const completedTasks = progress?.completedTasks ?? 0;
  const unassignedTasks = progress?.unassignedTasks ?? 0;
  const members = group.members ?? [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400 ring-1 ring-inset ring-blue-500/20">
            {t("leader.taskGroups.statusCompleted")}
          </span>
        );
      case "ARCHIVED":
        return (
          <span className="inline-flex items-center rounded-md bg-slate-500/10 px-2.5 py-1 text-xs font-semibold text-slate-400 ring-1 ring-inset ring-slate-500/20">
            {t("leader.taskGroups.statusArchived")}
          </span>
        );
      case "ACTIVE":
      default:
        return (
          <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
            {t("leader.taskGroups.statusActive")}
          </span>
        );
    }
  };

  return (
    <Modal>
      <MetalCard className="p-5 flex flex-col justify-between transition-all duration-300 hover:border-cyan-400/40 hover:shadow-[0_8px_30px_rgba(21,174,245,0.12)]">
        <div>
          {/* Header row: Name & Status */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-foreground group-hover:text-cyan-300 transition truncate">
                {group.name}
              </h3>
              {group.department && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-cyan-400">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{group.department.name}</span>
                </div>
              )}
            </div>
            <div className="shrink-0">{getStatusBadge(group.status)}</div>
          </div>

          {/* Description */}
          <p className="text-xs text-muted line-clamp-2 mt-2 mb-4">
            {group.description || "—"}
          </p>

          {/* Members list preview */}
          <div className="mb-4">
            <div className="flex items-center gap-1.5 text-xs text-muted mb-1.5">
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>
                {t("leader.taskGroups.membersCount", { count: members.length })}
              </span>
            </div>

            {members.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {members.slice(0, 4).map((member, idx) => {
                  const memberId =
                    getTaskGroupMemberId(member) || `member-${idx}`;
                  const memberName = getTaskGroupMemberName(member);
                  return (
                    <span
                      key={memberId}
                      className="inline-flex items-center rounded-lg bg-card/80 border border-border px-2 py-0.5 text-xs text-foreground/80 shadow-xs"
                    >
                      {memberName}
                    </span>
                  );
                })}
                {members.length > 4 && (
                  <span className="inline-flex items-center rounded-lg bg-card/60 px-2 py-0.5 text-xs text-muted">
                    +{members.length - 4}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted/70 italic">
                {t("leader.taskGroups.noMembers")}
              </p>
            )}
          </div>

          {/* Tasks Progress Bar */}
          <div className="mb-5 pt-3 border-t border-border/40">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-1 text-foreground/80">
                <ListTodo className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>
                  {completedTasks}/{totalTasks} tasks
                </span>
                {unassignedTasks > 0 && (
                  <span className="text-[11px] text-amber-400 ml-1 font-medium">
                    ({unassignedTasks} unassigned)
                  </span>
                )}
              </div>
              <span className="font-semibold text-cyan-300">
                {completionRate}%
              </span>
            </div>

            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {hasActions && (
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/40">
            {canUpdate ? (
              <Modal.Open opens={`quota-allocation-${group.id}`}>
                <button
                  type="button"
                  className="
                    flex-1 flex items-center justify-center gap-1.5 rounded-xl
                    border border-cyan-400/30 bg-cyan-500/10 py-2.5 px-3
                    text-xs font-semibold text-cyan-300
                    transition-all duration-200
                    hover:border-cyan-400/60 hover:bg-cyan-500/20 hover:text-cyan-200
                    active:scale-[0.98]
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
                    disabled:opacity-50 disabled:pointer-events-none cursor-pointer
                  "
                >
                  <PieChart className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {t("leader.taskGroups.allocateQuota")}
                  </span>
                </button>
              </Modal.Open>
            ) : (
              <div className="flex-1" />
            )}

            <div className="flex items-center gap-1 shrink-0">
              {canUpdate && (
                <Modal.Open opens={`edit-task-group-${group.id}`}>
                  <button
                    type="button"
                    className="
                      p-2.5 rounded-xl border border-border bg-card/60
                      text-muted hover:text-foreground hover:border-border-strong hover:bg-card
                      active:scale-95 transition-all duration-200
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400
                      cursor-pointer
                    "
                    title={t("leader.taskGroups.editGroup")}
                    aria-label={t("leader.taskGroups.editGroup")}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </Modal.Open>
              )}

              {canDelete && (
                <Modal.Open opens={`delete-task-group-${group.id}`}>
                  <button
                    type="button"
                    className="
                      p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10
                      text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-300
                      active:scale-95 transition-all duration-200
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400
                      cursor-pointer
                    "
                    title={t("leader.taskGroups.deleteGroup")}
                    aria-label={t("leader.taskGroups.deleteGroup")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </Modal.Open>
              )}
            </div>
          </div>
        )}
      </MetalCard>

      {/* Modal: Quota Allocation */}
      <Modal.Window name={`quota-allocation-${group.id}`} size="md">
        <TaskGroupQuotaAllocationModal taskGroup={group} />
      </Modal.Window>

      {/* Modal: Edit Task Group */}
      <Modal.Window name={`edit-task-group-${group.id}`} size="md">
        <TaskGroupEditModal taskGroup={group} />
      </Modal.Window>

      {/* Modal: Delete Task Group */}
      <Modal.Window name={`delete-task-group-${group.id}`} size="sm">
        <DeleteConfirm
          name={group.name}
          isDeleting={deleting}
          onConfirm={(close) => {
            deleteGroup(group.id);
            close?.();
          }}
        />
      </Modal.Window>
    </Modal>
  );
}

function DeleteConfirm({
  name,
  isDeleting,
  onConfirm,
  onCloseModal,
}: {
  name: string;
  isDeleting: boolean;
  onConfirm: (close?: () => void) => void;
  onCloseModal?: () => void;
}) {
  const t = useTranslations();
  return (
    <div className="px-2 py-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-400 mb-3 shadow-sm">
        <Trash2 className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground">
        {t("leader.taskGroups.deleteTitle")}
      </h3>
      <p className="mt-2 text-xs text-muted leading-relaxed max-w-sm mx-auto">
        {t("leader.taskGroups.deleteConfirm", { name })}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={onCloseModal}
          disabled={isDeleting}
          className="rounded-xl border border-border bg-card px-5 py-2.5 text-xs font-medium text-muted hover:border-border-strong hover:text-foreground active:scale-95 transition disabled:opacity-50"
        >
          {t("leader.taskGroups.cancel")}
        </button>
        <button
          type="button"
          onClick={() => onConfirm(onCloseModal)}
          disabled={isDeleting}
          className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-rose-500 active:scale-95 transition disabled:opacity-50"
        >
          {isDeleting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{t("leader.taskGroups.deleting")}</span>
            </>
          ) : (
            <span>{t("leader.taskGroups.confirm")}</span>
          )}
        </button>
      </div>
    </div>
  );
}
